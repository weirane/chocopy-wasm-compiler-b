import { Stmt, Expr, Type, UniOp, BinOp, Literal, Program, FunDef, VarInit, Class, SourceLocation } from './ast';
import { TypeCheckError } from './error_reporting'
import { NUM, BOOL, NONE, CLASS } from './utils';

let closureClassCounter = 0
// closures that has one argument
export let allClosures: string[] = [];
export const closureNargs: Set<number> = new Set();

export function translateClosuresToClasses(program : Program<SourceLocation>): Program<SourceLocation> {
  closureClassCounter = 0
  allClosures = []
  closureNargs.clear()

  program.funs.forEach(func => translateClosuresInFunc(func, program))
  // TODO methods in class might also contain closures

  return program
}

function translateClosuresInFunc(f: FunDef<SourceLocation>, program: Program<SourceLocation>) {
  const body: Stmt<SourceLocation>[] = []
  for (const stmt of f.body) {
    if (stmt.tag == "closure") {
      // global variable
      // def f
      //     def g <-- closure
      const g = stmt.func

      // generate a name C for the closure class
      const gClassName = genClosureClassName(g.name)
      allClosures.push(gClassName)
      closureNargs.add(g.parameters.length)

      // escape analysis
      // get a list of closure variables (focus on read-only now) and their types
      const closureVars: Map<string, Type> = new Map();
      const reads: Set<string> = new Set();
      for (const s of g.body) {
        getStmtRW(s, reads);
      }

      for (const p of g.parameters) {
        reads.delete(p.name);
      }
      for (const v of g.inits) {
        reads.delete(v.name);
      }

      const flocals: Map<string, Type> = new Map() // local vars in f
                                                   // part of it becomes closure vars for g
      for (const p of f.parameters) {
        flocals.set(p.name, p.type)
      }
      for (const v of f.inits) {
        flocals.set(v.name, v.type)
      }

      for (const id of reads) {
        if (flocals.has(id)) {
          closureVars.set(id, flocals.get(id))
        } else {
          if (!program.inits.some(ini => ini.name === id)) {
            throw new TypeCheckError(`unknown variable ${id}`);
          }
        }
      }

      // generate a class C
      // TODO C is a subclass of Callable...
      //     field 1 with type
      //     field 2 with type...
      //     def __call__(...) -> ...:  the original function
      const gFields: VarInit<SourceLocation>[] = []
      for (const [v, t] of closureVars.entries()) {
        const field = {
          a: g.a,
          name: v,
          type: t,
          value: defaultLiteral(t)
        };
        gFields.push(field)
      }
      translateClosureReadsToLookup(g.body, closureVars);
      const callMethod = {
        a: g.a,
        name: "__call__",
        parameters: [{name: "self", type: CLASS(gClassName)}, ...g.parameters],
        ret: g.ret,
        inits: g.inits,
        body: g.body,
      };
      const initMethod = {
        a: g.a,
        name: "__init__",
        parameters: [{name: "self", type: CLASS(gClassName)}],
        ret: NONE,
        inits: [] as any,
        body: [] as any
      };
      const gClass: Class<SourceLocation> = {
        a: g.a,
        name: gClassName,
        fields: gFields,
        methods: [callMethod, initMethod]
      }
      program.classes.push(gClass)

      // add funcname to localEnv
      f.inits.push({
        a: g.a,
        name: g.name,
        type: CLASS(gClassName),
        value: defaultLiteral(NONE),
      });

      // funcname = C()       # create the closure instance
      body.push({
        a: g.a,
        tag: "assign",
        name: g.name,
        value: {
          a: g.a,
          tag: "call",
          name: gClassName,
          arguments: []
        }
      })

      // func.field1 = field1
      // func.field2 = field2
      // ...
      for (const v of closureVars.keys()) {
        body.push({
          a: g.a,
          tag: "field-assign",
          obj: {
            a: g.a,
            tag: "id",
            name: g.name,
          },
          field: v,
          value: {   // TODO might be self.v for nested closures
            a: g.a,
            tag: "id",
            name: v
          }
        });
      }
    } else {
      body.push(stmt)
    }
  }
  f.body = body
}

// modify in place
function translateClosureReadsToLookup(stmts: Stmt<SourceLocation>[], closureVars: Map<string, Type>) {
  for (const stmt of stmts) {
    switch(stmt.tag) {
      case "assign":
        stmt.value = translateClosureReadsToLookupInExpr(stmt.value, closureVars)
        return;
      case "assign-destr":
        stmt.rhs = translateClosureReadsToLookupInExpr(stmt.rhs, closureVars)
        return;
      case "return":
        stmt.value = translateClosureReadsToLookupInExpr(stmt.value, closureVars)
        return;
      case "expr":
        stmt.expr = translateClosureReadsToLookupInExpr(stmt.expr, closureVars)
        return;
      case "field-assign":
        stmt.obj = translateClosureReadsToLookupInExpr(stmt.obj, closureVars)
        stmt.value = translateClosureReadsToLookupInExpr(stmt.value, closureVars)
        return;
      case "index-assign":
        stmt.obj = translateClosureReadsToLookupInExpr(stmt.obj, closureVars)
        stmt.index = translateClosureReadsToLookupInExpr(stmt.index, closureVars)
        stmt.value = translateClosureReadsToLookupInExpr(stmt.value, closureVars)
        return;
      case "if":
        stmt.cond = translateClosureReadsToLookupInExpr(stmt.cond, closureVars)
        translateClosureReadsToLookup(stmt.thn, closureVars)
        translateClosureReadsToLookup(stmt.els, closureVars)
        return;
      case "while":
        stmt.cond = translateClosureReadsToLookupInExpr(stmt.cond, closureVars)
        translateClosureReadsToLookup(stmt.body, closureVars)
        return;
      case "for":
        stmt.iterable = translateClosureReadsToLookupInExpr(stmt.iterable, closureVars)
        translateClosureReadsToLookup(stmt.body, closureVars)
        if (stmt.elseBody)
          translateClosureReadsToLookup(stmt.elseBody, closureVars)
        return;
      case "closure":
        throw new Error("nested closure not implemented"); //TODO
      case "pass":
      case "nonlocal":
      case "global":
      case "break":
      case "continue":
        return;
    }
  }
}

// return a new one
function translateClosureReadsToLookupInExpr(expr: Expr<SourceLocation>, closureVars: Map<string, Type>): Expr<SourceLocation> {
  switch(expr.tag) {
    case "literal":
      return expr;
    case "id":
      if (closureVars.has(expr.name)) {
        return {
          a: expr.a,
          tag: "lookup",
          obj: {
            a: expr.a,
            tag: "id",
            name: "self"
          },
          field: expr.name
        }
      } else {
        return expr
      }
    case "binop": {
      return {
        ...expr, 
        left: translateClosureReadsToLookupInExpr(expr.left, closureVars), 
        right: translateClosureReadsToLookupInExpr(expr.right, closureVars)
      };
    }
    case "uniop":
      return {
        ...expr, 
        expr: translateClosureReadsToLookupInExpr(expr.expr, closureVars), 
      };
    case "call":
      // TODO: expr.name
      return {
        ...expr,
        arguments: expr.arguments.map(arg => translateClosureReadsToLookupInExpr(arg, closureVars))
      }
    case "lookup":
      return {
        ...expr,
        obj: translateClosureReadsToLookupInExpr(expr.obj, closureVars),
      }
    case "listliteral":
      return {
        ...expr,
        elements: expr.elements.map(a => translateClosureReadsToLookupInExpr(a, closureVars)),
      };
    case "index":
      return {
        ...expr,
        obj: translateClosureReadsToLookupInExpr(expr.obj, closureVars),
        index: translateClosureReadsToLookupInExpr(expr.index, closureVars),
      };
    case "method-call":
      return {
        ...expr,
        obj: translateClosureReadsToLookupInExpr(expr.obj, closureVars),
        arguments: expr.arguments.map(arg => translateClosureReadsToLookupInExpr(arg, closureVars))
      }
    case "construct":
      throw new Error("unreachable");
    case "lambda":
      throw new Error("lambda not implemented");
    case "set":
      return {
        ...expr,
        values: expr.values.map(a => translateClosureReadsToLookupInExpr(a, closureVars)),
      };
    case "comprehension":
      return {
        ...expr,
        lhs: translateClosureReadsToLookupInExpr(expr.lhs, closureVars),
        iterable: translateClosureReadsToLookupInExpr(expr.iterable, closureVars),
        ifcond: expr.ifcond ? translateClosureReadsToLookupInExpr(expr.ifcond, closureVars) : expr.ifcond,
      };
    case "ternary":
      return {
        ...expr,
        exprIfTrue: translateClosureReadsToLookupInExpr(expr.exprIfTrue, closureVars),
        ifcond: translateClosureReadsToLookupInExpr(expr.ifcond, closureVars),
        exprIfFalse: translateClosureReadsToLookupInExpr(expr.exprIfFalse, closureVars),
      };
    case "non-paren-vals":
      return {
        ...expr,
        values: expr.values.map(a => translateClosureReadsToLookupInExpr(a, closureVars)),
      };
    default:
      console.log(`skipped ${(expr as any).tag}`);
      return expr;
  }
}

function genClosureClassName(originalName: string) {
  return `Clo_${closureClassCounter++}_${originalName}`
}

function getExprRW(expr: Expr<SourceLocation>, reads: Set<string>) {
  switch(expr.tag) {
    case "literal":
      return;
    case "id":
      reads.add(expr.name);
      return;
    case "binop": {
      getExprRW(expr.left, reads);
      getExprRW(expr.right, reads);
      return;
    }
    case "uniop":
      getExprRW(expr.expr, reads);
      return;
    case "call":
      // TODO: add expr.name
      for (const arg of expr.arguments) {
        getExprRW(arg, reads);
      }
      return;
    case "lookup":
      getExprRW(expr.obj, reads);
      return;
    case "listliteral":
      for (const e of expr.elements) getExprRW(e, reads);
      return;
    case "index":
      getExprRW(expr.obj, reads);
      getExprRW(expr.index, reads);
      return;
    case "method-call":
      getExprRW(expr.obj, reads);
      for (const arg of expr.arguments) {
        getExprRW(arg, reads);
      }
      return;
    case "construct":
      throw new Error("unreachable");
    case "lambda":
      throw new Error("lambda not implemented");
    case "set":
      for (const e of expr.values) getExprRW(e, reads);
      return;
    case "comprehension":
      getExprRW(expr.lhs, reads);
      getExprRW(expr.iterable, reads);
      if (expr.ifcond) getExprRW(expr.ifcond, reads);
      return;
    case "non-paren-vals":
      for (const e of expr.values) getExprRW(e, reads);
      return;
  }
}

function getStmtRW(stmt: Stmt<SourceLocation>, reads: Set<string>) {
  switch(stmt.tag) {
    case "assign":
      getExprRW(stmt.value, reads);
      return;
    case "assign-destr":
      getExprRW(stmt.rhs, reads);
      return;
    case "return":
      getExprRW(stmt.value, reads);
      return;
    case "expr":
      getExprRW(stmt.expr, reads);
      return;
    case "field-assign":
      getExprRW(stmt.obj, reads);
      getExprRW(stmt.value, reads);
      return;
    case "index-assign":
      getExprRW(stmt.obj, reads);
      getExprRW(stmt.index, reads);
      getExprRW(stmt.value, reads);
      return;
    case "if":
      getExprRW(stmt.cond, reads);
      for (const s of stmt.thn) {
        getStmtRW(s, reads);
      }
      for (const s of stmt.els) {
        getStmtRW(s, reads);
      }
      return;
    case "while":
      getExprRW(stmt.cond, reads);
      for (const s of stmt.body) {
        getStmtRW(s, reads);
      }
      return;
    case "closure":
      // TODO: find free var
      throw new Error("nested closure not implemented");
    case "for":
      getExprRW(stmt.iterable, reads);
      for (const s of stmt.body) getStmtRW(s, reads);
      if (stmt.elseBody) for (const s of stmt.elseBody) getStmtRW(s, reads);
      return;
    case "pass":
    case "nonlocal":
    case "global":
    case "break":
    case "continue":
      return;
  }
}

function defaultLiteral(t: Type): Literal<SourceLocation> {
  const a = { line: 0, column: 0, srcCode: "(internal)" };
  switch(t.tag) {
    case "number":
      return { tag: "num", value: 0, a }
    case "bool":
      return { tag: "bool", value: false, a }
    default:
      return { tag: "none", a }
  }
}
