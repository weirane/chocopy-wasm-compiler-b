
import { table } from 'console';
import { Stmt, Expr, Type, UniOp, BinOp, Literal, Program, FunDef, VarInit, Class, SourceLocation } from './ast';
import { NUM, BOOL, NONE, CLASS } from './utils';
import { emptyEnv } from './compiler';
import { TypeCheckError } from './error_reporting'

export type GlobalTypeEnv = {
  globals: Map<string, Type>,
  functions: Map<string, [Array<Type>, Type]>,
  classes: Map<string, [Map<string, Type>, Map<string, [Array<Type>, Type]>]>
}

export type LocalTypeEnv = {
  vars: Map<string, Type>,
  closureVars: Map<string, Type>,
  expectedRet: Type,
  actualRet: Type,
  topLevel: Boolean
}

const defaultGlobalFunctions = new Map();
defaultGlobalFunctions.set("abs", [[NUM], NUM]);
defaultGlobalFunctions.set("max", [[NUM, NUM], NUM]);
defaultGlobalFunctions.set("min", [[NUM, NUM], NUM]);
defaultGlobalFunctions.set("pow", [[NUM, NUM], NUM]);
defaultGlobalFunctions.set("print", [[CLASS("object")], NUM]);

export const defaultTypeEnv = {
  globals: new Map(),
  functions: defaultGlobalFunctions,
  classes: new Map(),
};

export function emptyGlobalTypeEnv() : GlobalTypeEnv {
  return {
    globals: new Map(),
    functions: new Map(),
    classes: new Map()
  };
}

export function emptyLocalTypeEnv() : LocalTypeEnv {
  return {
    vars: new Map(),
    closureVars: new Map(),
    expectedRet: NONE,
    actualRet: NONE,
    topLevel: true
  };
}

export type TypeError = {
  message: string
}

export function equalType(t1: Type, t2: Type) {
  return (
    t1 === t2 ||
    (t1.tag === "class" && t2.tag === "class" && t1.name === t2.name)
  );
}

export function isNoneOrClass(t: Type) {
  return t.tag === "none" || t.tag === "class";
}

export function isSubtype(env: GlobalTypeEnv, t1: Type, t2: Type): boolean {
  if (t1.tag === "func" && t2.tag === "func") {
    // subtying rule for function: arguments are contravariant, return type is covariant
    return (
      t1.args.length === t2.args.length &&
        isAssignable(env, t1.ret, t2.ret) &&
        t1.args.every((_, i) => isAssignable(env, t2.args[i], t1.args[i]))
    );
  } else {
    return equalType(t1, t2) || t1.tag === "none" && (t2.tag === "class" || t2.tag === "func");
  }
}

export function isAssignable(env : GlobalTypeEnv, t1 : Type, t2 : Type) : boolean {
  return isSubtype(env, t1, t2);
}

export function join(env : GlobalTypeEnv, t1 : Type, t2 : Type) : Type {
  return NONE
}

export function augmentTEnv(env : GlobalTypeEnv, program : Program<SourceLocation>) : GlobalTypeEnv {
  const newGlobs = new Map(env.globals);
  const newFuns = new Map(env.functions);
  const newClasses = new Map(env.classes);
  program.inits.forEach(init => newGlobs.set(init.name, init.type));
  program.funs.forEach(fun => newFuns.set(fun.name, [fun.parameters.map(p => p.type), fun.ret]));
  program.classes.forEach(cls => {
    const fields = new Map();
    const methods = new Map();
    cls.fields.forEach(field => fields.set(field.name, field.type));
    cls.methods.forEach(method => methods.set(method.name, [method.parameters.map(p => p.type), method.ret]));
    newClasses.set(cls.name, [fields, methods]);
  });
  return { globals: newGlobs, functions: newFuns, classes: newClasses };
}

export function tc(env : GlobalTypeEnv, program : Program<SourceLocation>) : [Program<[Type, SourceLocation]>, GlobalTypeEnv] {
  const locals = emptyLocalTypeEnv();
  const newEnv = augmentTEnv(env, program);
  const tInits = program.inits.map(init => tcInit(env, init));
  const tDefs = program.funs.map(fun => tcDef(newEnv, fun, new Map()));
  const tClasses = program.classes.map(cls => tcClass(newEnv, cls));

  // program.inits.forEach(init => env.globals.set(init.name, tcInit(init)));
  // program.funs.forEach(fun => env.functions.set(fun.name, [fun.parameters.map(p => p.type), fun.ret]));
  // program.funs.forEach(fun => tcDef(env, fun));
  // Strategy here is to allow tcBlock to populate the locals, then copy to the
  // global env afterwards (tcBlock changes locals)
  const tBody = tcBlock(newEnv, locals, program.stmts);
  var lastTyp : Type = NONE;
  if (tBody.length){
    lastTyp = tBody[tBody.length - 1].a[0];
  }
  // TODO(joe): check for assignment in existing env vs. new declaration
  // and look for assignment consistency
  for (let name of locals.vars.keys()) {
    newEnv.globals.set(name, locals.vars.get(name));
  }
  const aprogram: Program<[Type, SourceLocation]> = {a: [lastTyp, program.a], inits: tInits, funs: tDefs, classes: tClasses, stmts: tBody};
  return [aprogram, newEnv];
}

export function tcInit(env: GlobalTypeEnv, init : VarInit<SourceLocation>) : VarInit<[Type, SourceLocation]> {
  const valTyp = tcLiteral(init.value);
  if (isAssignable(env, valTyp, init.type)) {
    return {...init, a: [NONE, init.a]};
  } else {
    throw new TypeCheckError("Expected type `" + init.type + "`; got type `" + valTyp + "`");
  }
}

export function tcDef(env : GlobalTypeEnv, fun : FunDef<SourceLocation>, closureVars : Map<string, Type>) : FunDef<[Type, SourceLocation]> {
  var locals = emptyLocalTypeEnv();
  locals.expectedRet = fun.ret;
  locals.topLevel = false;
  locals.closureVars = closureVars;
  fun.parameters.forEach(p => locals.vars.set(p.name, p.type));
  var tcinits: VarInit<[Type, SourceLocation]>[] = [];
  fun.inits.forEach(init => {
    const tcinit = tcInit(env, init);
    tcinits.push(tcinit);
    locals.vars.set(init.name, tcinit.type);
  });
  
  const tBody = tcBlock(env, locals, fun.body);
  if (!isAssignable(env, locals.actualRet, locals.expectedRet))
    throw new TypeCheckError(`expected return type of block: ${JSON.stringify(locals.expectedRet)} does not match actual return type: ${JSON.stringify(locals.actualRet)}`)
  return {...fun, a:[NONE, fun.a], body: tBody, inits: tcinits};
}

export function tcClass(env: GlobalTypeEnv, cls : Class<SourceLocation>) : Class<[Type, SourceLocation]> {
  const tFields = cls.fields.map(field => tcInit(env, field));
  const tMethods = cls.methods.map(method => tcDef(env, method, new Map()));
  const init = cls.methods.find(method => method.name === "__init__") // we'll always find __init__
  if (init.parameters.length !== 1 || 
    init.parameters[0].name !== "self" ||
    !equalType(init.parameters[0].type, CLASS(cls.name)) ||
    init.ret !== NONE)
    throw new TypeCheckError("Cannot override __init__ type signature");
  return {a: [NONE, cls.a], name: cls.name, fields: tFields, methods: tMethods};
}

export function tcBlock(env : GlobalTypeEnv, locals : LocalTypeEnv, stmts : Array<Stmt<SourceLocation>>) : Array<Stmt<[Type, SourceLocation]>> {
  var tStmts = stmts.map(stmt => tcStmt(env, locals, stmt));
  return tStmts;
}

export function tcStmt(env : GlobalTypeEnv, locals : LocalTypeEnv, stmt : Stmt<SourceLocation>) : Stmt<[Type, SourceLocation]> {
  switch(stmt.tag) {
    case "assign":
      const tValExpr = tcExpr(env, locals, stmt.value);
      var nameTyp;
      if (locals.vars.has(stmt.name)) {
        nameTyp = locals.vars.get(stmt.name);
      } else if (env.globals.has(stmt.name)) {
        nameTyp = env.globals.get(stmt.name);
      } else {
        throw new TypeCheckError("Unbound id: " + stmt.name);
      }
      if(!isAssignable(env, tValExpr.a[0], nameTyp)) 
        throw new TypeCheckError("Non-assignable types");
      return {a: [NONE, stmt.a], tag: stmt.tag, name: stmt.name, value: tValExpr};
    case "expr":
      const tExpr = tcExpr(env, locals, stmt.expr);
      return {a: tExpr.a, tag: stmt.tag, expr: tExpr};
    case "if":
      var tCond = tcExpr(env, locals, stmt.cond);
      const tThn = tcBlock(env, locals, stmt.thn);
      const thnTyp = locals.actualRet;
      locals.actualRet = NONE;
      const tEls = tcBlock(env, locals, stmt.els);
      const elsTyp = locals.actualRet;
      if (tCond.a[0] !== BOOL) 
        throw new TypeCheckError("Condition Expression Must be a bool");
      if (thnTyp !== elsTyp)
        locals.actualRet = { tag: "either", left: thnTyp, right: elsTyp }
      return {a: [thnTyp, stmt.a], tag: stmt.tag, cond: tCond, thn: tThn, els: tEls};
    case "return":
      if (locals.topLevel)
        throw new TypeCheckError("cannot return outside of functions");
      const tRet = tcExpr(env, locals, stmt.value);
      if (!isAssignable(env, tRet.a[0], locals.expectedRet)) 
        throw new TypeCheckError("expected return type `" + (locals.expectedRet as any).tag + "`; got type `" + (tRet.a as any).tag + "`");
      locals.actualRet = tRet.a[0];
      return {a: tRet.a, tag: stmt.tag, value:tRet};
    case "while":
      var tCond = tcExpr(env, locals, stmt.cond);
      const tBody = tcBlock(env, locals, stmt.body);
      if (!equalType(tCond.a[0], BOOL)) 
        throw new TypeCheckError("Condition Expression Must be a bool");
      return {a: [NONE, stmt.a], tag:stmt.tag, cond: tCond, body: tBody};
    case "pass":
      return {a: [NONE, stmt.a], tag: stmt.tag};
    case "field-assign":
      var tObj = tcExpr(env, locals, stmt.obj);
      const tVal = tcExpr(env, locals, stmt.value);
      if (tObj.a[0].tag !== "class") 
        throw new TypeCheckError("field assignments require an object");
      if (!env.classes.has(tObj.a[0].name)) 
        throw new TypeCheckError("field assignment on an unknown class");
      const [fields, _] = env.classes.get(tObj.a[0].name);
      if (!fields.has(stmt.field)) 
        throw new TypeCheckError(`could not find field ${stmt.field} in class ${tObj.a[0].name}`);
      if (!isAssignable(env, tVal.a[0], fields.get(stmt.field)))
        throw new TypeCheckError(`could not assign value of type: ${tVal.a}; field ${stmt.field} expected type: ${fields.get(stmt.field)}`);
      return {...stmt, a: [NONE, stmt.a], obj: tObj, value: tVal};
    case "closure": {
      // global variable
      // def f
      //     def g <-- closure
      let func: FunDef<any> = stmt.func;

      // escape analysis
      // variables in envRead become fields in the closure-turned set
      func.envRead = new Set();
      const envRead: Set<string> = new Set();
      const envWrite: Set<string> = new Set();
      for (const s of func.body) {
        getStmtRW(s, envRead, envWrite);
      }
      for (const p of func.parameters) {
        envRead.delete(p.name);
      }
      for (const s of func.inits) {
        envRead.delete(s.name);
      }
      for (const s of envRead) {
        if (locals.vars.has(s)) {
          func.envRead.add(s);
        } else {
          if (!env.globals.has(s)) {
            throw new TypeCheckError(`unknown variable ${s}`);
          }
        }
      }
      console.log(func.envRead);
      // TODO: func.envWrite

      func = tcDef(env, func, new Map(locals.vars))
      return func as any
    }
  }
}

function getExprRW(expr: Expr<SourceLocation>, reads: Set<string>, writes: Set<string>) {
  switch(expr.tag) {
    case "literal":
      return;
    case "id":
      reads.add(expr.name);
      return;
    case "binop": {
      getExprRW(expr.left, reads, writes);
      getExprRW(expr.right, reads, writes);
      return;
    }
    case "uniop":
      getExprRW(expr.expr, reads, writes);
      return;
    case "builtin1":
      getExprRW(expr.arg, reads, writes);
      return;
    case "builtin2":
      getExprRW(expr.left, reads, writes);
      getExprRW(expr.right, reads, writes);
      return;
    case "call":
      // TODO: add expr.name
      for (const arg of expr.arguments) {
        getExprRW(arg, reads, writes);
      }
      return;
    case "lookup":
      getExprRW(expr.obj, reads, writes);
      return;
    case "method-call":
      getExprRW(expr.obj, reads, writes);
      for (const arg of expr.arguments) {
        getExprRW(arg, reads, writes);
      }
      return;
    case "construct":
      // TODO
      return;
    case "lambda":
      throw new Error("lambda not implemented");
  }
}

export function getStmtRW(stmt: Stmt<SourceLocation>, reads: Set<string>, writes: Set<string>) {
  switch(stmt.tag) {
    case "assign":
      writes.add(stmt.name);
      getExprRW(stmt.value, reads, writes);
      return;
    case "return":
      getExprRW(stmt.value, reads, writes);
      return;
    case "expr":
      getExprRW(stmt.expr, reads, writes);
      return;
    case "field-assign":
      getExprRW(stmt.obj, reads, writes);
      getExprRW(stmt.value, reads, writes);
      return;
    case "if":
      getExprRW(stmt.cond, reads, writes);
      for (const s of stmt.thn) {
        getStmtRW(s, reads, writes);
      }
      for (const s of stmt.els) {
        getStmtRW(s, reads, writes);
      }
      return;
    case "while":
      getExprRW(stmt.cond, reads, writes);
      for (const s of stmt.body) {
        getStmtRW(s, reads, writes);
      }
      return;
    case "closure":
      // TODO: find free var
      throw new Error("nested closure not implemented");
    case "pass":
    case "nonlocal":
    case "global":
      return;
  }
}

export function tcExpr(env : GlobalTypeEnv, locals : LocalTypeEnv, expr : Expr<SourceLocation>) : Expr<[Type, SourceLocation]> {
  switch(expr.tag) {
    case "literal": 
      return {...expr, a: [tcLiteral(expr.value), expr.a]};
    case "binop":
      const tLeft = tcExpr(env, locals, expr.left);
      const tRight = tcExpr(env, locals, expr.right);
      const tBin = {...expr, left: tLeft, right: tRight};
      switch(expr.op) {
        case BinOp.Plus:
        case BinOp.Minus:
        case BinOp.Mul:
        case BinOp.IDiv:
        case BinOp.Mod:
          if(equalType(tLeft.a[0], NUM) && equalType(tRight.a[0], NUM)) { return {...tBin, a: [NUM, expr.a]}}
          else { throw new TypeCheckError("Type mismatch for numeric op" + expr.op); }
        case BinOp.Eq:
        case BinOp.Neq:
          if(tLeft.a[0].tag === "class" || tRight.a[0].tag === "class") throw new TypeCheckError("cannot apply operator '==' on class types")
          if(equalType(tLeft.a[0], tRight.a[0])) { return {...tBin, a: [BOOL, expr.a]} ; }
          else { throw new TypeCheckError("Type mismatch for op" + expr.op)}
        case BinOp.Lte:
        case BinOp.Gte:
        case BinOp.Lt:
        case BinOp.Gt:
          if(equalType(tLeft.a[0], NUM) && equalType(tRight.a[0], NUM)) { return {...tBin, a: [BOOL, expr.a]} ; }
          else { throw new TypeCheckError("Type mismatch for op" + expr.op) }
        case BinOp.And:
        case BinOp.Or:
          if(equalType(tLeft.a[0], BOOL) && equalType(tRight.a[0], BOOL)) { return {...tBin, a: [BOOL, expr.a]} ; }
          else { throw new TypeCheckError("Type mismatch for boolean op" + expr.op); }
        case BinOp.Is:
          if(!isNoneOrClass(tLeft.a[0]) || !isNoneOrClass(tRight.a[0]))
            throw new TypeCheckError("is operands must be objects");
          return {...tBin, a: [BOOL, expr.a]};
      }
    case "uniop":
      const tExpr = tcExpr(env, locals, expr.expr);
      const tUni = {...expr, a: tExpr.a, expr: tExpr}
      switch(expr.op) {
        case UniOp.Neg:
          if(equalType(tExpr.a[0], NUM)) { return tUni }
          else { throw new TypeCheckError("Type mismatch for op" + expr.op);}
        case UniOp.Not:
          if(equalType(tExpr.a[0], BOOL)) { return tUni }
          else { throw new TypeCheckError("Type mismatch for op" + expr.op);}
      }
    case "id":
      if (locals.vars.has(expr.name)) {
        return {...expr, a: [locals.vars.get(expr.name), expr.a]};
      } else if (env.globals.has(expr.name)) {
        return {...expr, a: [env.globals.get(expr.name), expr.a]};
      } else if (locals.closureVars.has(expr.name)) {
        return {...expr, a: [locals.closureVars.get(expr.name), expr.a]};
      } else {
        throw new TypeCheckError("Unbound id: " + expr.name);
      }
    case "builtin1":
      if (expr.name === "print") {
        const tArg = tcExpr(env, locals, expr.arg);
        return {...expr, a: tArg.a, arg: tArg};
      } else if(env.functions.has(expr.name)) {
        const [[expectedArgTyp], retTyp] = env.functions.get(expr.name);
        const tArg = tcExpr(env, locals, expr.arg);
        
        if(isAssignable(env, tArg.a[0], expectedArgTyp)) {
          return {...expr, a: [retTyp, expr.a], arg: tArg};
        } else {
          throw new TypeError("Function call type mismatch: " + expr.name);
        }
      } else {
        throw new TypeError("Undefined function: " + expr.name);
      }
    case "builtin2":
      if(env.functions.has(expr.name)) {
        const [[leftTyp, rightTyp], retTyp] = env.functions.get(expr.name);
        const tLeftArg = tcExpr(env, locals, expr.left);
        const tRightArg = tcExpr(env, locals, expr.right);
        if(isAssignable(env, leftTyp, tLeftArg.a[0]) && isAssignable(env, rightTyp, tRightArg.a[0])) {
          return {...expr, a: [retTyp, expr.a], left: tLeftArg, right: tRightArg};
        } else {
          throw new TypeError("Function call type mismatch: " + expr.name);
        }
      } else {
        throw new TypeError("Undefined function: " + expr.name);
      }
    case "call":
      if(env.classes.has(expr.name)) {
        // surprise surprise this is actually a constructor
        const tConstruct : Expr<[Type, SourceLocation]> = { a: [CLASS(expr.name), expr.a], tag: "construct", name: expr.name };
        const [_, methods] = env.classes.get(expr.name);
        if (methods.has("__init__")) {
          const [initArgs, initRet] = methods.get("__init__");
          if (expr.arguments.length !== initArgs.length - 1)
            throw new TypeCheckError("__init__ didn't receive the correct number of arguments from the constructor");
          if (initRet !== NONE) 
            throw new TypeCheckError("__init__  must have a void return type");
          return tConstruct;
        } else {
          return tConstruct;
        }
      } else if(env.functions.has(expr.name)) {
        const [argTypes, retType] = env.functions.get(expr.name);
        const tArgs = expr.arguments.map(arg => tcExpr(env, locals, arg));

        if(argTypes.length === expr.arguments.length &&
           tArgs.every((tArg, i) => tArg.a[0] === argTypes[i])) {
             return {...expr, a: [retType, expr.a], arguments: tArgs};
           } else {
            throw new TypeError("Function call type mismatch: " + expr.name);
           }
      } else {
        throw new TypeError("Undefined function: " + expr.name);
      }
    case "lookup":
      var tObj = tcExpr(env, locals, expr.obj);
      if (tObj.a[0].tag === "class") {
        if (env.classes.has(tObj.a[0].name)) {
          const [fields, _] = env.classes.get(tObj.a[0].name);
          if (fields.has(expr.field)) {
            return {...expr, a: [fields.get(expr.field), expr.a], obj: tObj};
          } else {
            throw new TypeCheckError(`could not found field ${expr.field} in class ${tObj.a[0].name}`);
          }
        } else {
          throw new TypeCheckError("field lookup on an unknown class");
        }
      } else {
        throw new TypeCheckError("field lookups require an object");
      }
    case "method-call":
      var tObj = tcExpr(env, locals, expr.obj);
      var tArgs = expr.arguments.map(arg => tcExpr(env, locals, arg));
      if (tObj.a[0].tag === "class") {
        if (env.classes.has(tObj.a[0].name)) {
          const [_, methods] = env.classes.get(tObj.a[0].name);
          if (methods.has(expr.method)) {
            const [methodArgs, methodRet] = methods.get(expr.method);
            const realArgs = [tObj].concat(tArgs);
            if(methodArgs.length === realArgs.length &&
              methodArgs.every((argTyp, i) => isAssignable(env, realArgs[i].a[0], argTyp))) {
                return {...expr, a: [methodRet, expr.a], obj: tObj, arguments: tArgs};
              } else {
               throw new TypeCheckError(`Method call type mismatch: ${expr.method} --- callArgs: ${JSON.stringify(realArgs)}, methodArgs: ${JSON.stringify(methodArgs)}` );
              }
          } else {
            throw new TypeCheckError(`could not found method ${expr.method} in class ${tObj.a[0].name}`);
          }
        } else {
          throw new TypeCheckError("method call on an unknown class");
        }
      } else {
        throw new TypeCheckError("method calls require an object");
      }
    default: throw new TypeCheckError(`unimplemented type checking for expr: ${expr}`);
  }
}

export function tcLiteral(literal : Literal) {
    switch(literal.tag) {
        case "bool": return BOOL;
        case "num": return NUM;
        case "none": return NONE;
    }
}
