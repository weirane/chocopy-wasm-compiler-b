import { Type, Program, SourceLocation, FunDef, Expr, Stmt, Literal, BinOp, UniOp, Class} from './ast';


let isChanged = false;

export function optimizeAst(program: Program<[Type, SourceLocation]>) : Program<[Type, SourceLocation]> {
    
    var newProgram = {...program};
    let counter = 0;
    do {
        isChanged = false;
        counter++;
        // Optimize function definitions
        const optFuns = newProgram.funs.map(fun => optimizeFuncDef(fun));
        // Optimize class definitions
        const optClasses = newProgram.classes.map(classDef => optimizeClassDef(classDef));
        // Dead code elimination for statements after definitions
        var optStmts = deadCodeElimination(newProgram.stmts);
        // Optimize statements
        optStmts = optStmts.map(stmt => optimizeStmt(stmt));
        newProgram = {...newProgram, funs: optFuns, stmts: optStmts, classes: optClasses}
    } while(isChanged);

    // console.log(`Optimization completed after ${counter} iterations.`)
    
    return newProgram;
}

export function deadCodeElimination(stmts:Array<Stmt<[Type, SourceLocation]>>): Array<Stmt<[Type, SourceLocation]>> {
    // Eliminate unreachable codes after return
    var optCodeChunk = DCEForReturn(stmts);
    // Eliminate if branches with boolean literal condition and while loop with false literal as condition
    optCodeChunk = DCEForControlFlow(optCodeChunk);
    // Eliminate redundant pass statements
    optCodeChunk = DCEForPass(optCodeChunk);

    return optCodeChunk;
}

function optimizeFuncDef(funDef: FunDef<[Type, SourceLocation]>): FunDef<[Type, SourceLocation]> {
    // Dead code elimination
    var optBody = deadCodeElimination(funDef.body);
    // Constant folding
    optBody = optBody.map(stmt => optimizeStmt(stmt));
    return {...funDef, body: optBody};
}

function optimizeClassDef(classDef: Class<[Type, SourceLocation]>): Class<[Type, SourceLocation]> {
    // Dead code Elimination: Remove the statements after return inside method body
    const newMethods: Array<FunDef<[Type, SourceLocation]>> = classDef.methods.map(method => {
        return optimizeFuncDef(method);
    });

    return {...classDef, methods: newMethods};
}

/**
 * Dead code elimination: Remove the redundant pass statements
 * Besides the user-defined pass statements, other optimization operations may also generate pass statements
 * 
 * @param stmts 
 * @returns 
 */
function DCEForPass(stmts: Array<Stmt<[Type, SourceLocation]>>): Array<Stmt<[Type, SourceLocation]>> {
    const newStmts: Array<Stmt<[Type, SourceLocation]>> = [];
    for (let [index, stmt] of stmts.entries()) {
        // Only add pass statement when the last statement is pass statement and there is no other valid statements
        if (stmt.tag === 'pass' && index === stmts.length-1 && newStmts.length === 0) {
            newStmts.push(stmt);
        } else if (stmt.tag === 'pass') {
            continue;
        } else {
            newStmts.push(stmt);
        }
    }

    return newStmts;
}

/**
 * Dead code elimination: Remove the unreachable codes after return statement
 * 
 * Note: This function will return the exact same array if there were no return statement in the array
 * @param stmts An array of statements as the body of function/if-branch/loops
 * @returns an array statements with no statement after return statement
 */
function DCEForReturn(stmts: Array<Stmt<[Type, SourceLocation]>>): Array<Stmt<[Type, SourceLocation]>> {
    const newStmts: Array<Stmt<[Type, SourceLocation]>> = [];
    for (let [index, stmt] of stmts.entries()) {
        switch(stmt.tag) {
            case "return": {
                newStmts.push(stmt);
                if (index < stmts.length-1) {
                    isChanged = true;
                }
                return newStmts;
            } case "if": {
                const newThenBody = DCEForReturn(stmt.thn);
                const newElseBody = DCEForReturn(stmt.els);
                const newIfStmt = {...stmt, thn: newThenBody, els: newElseBody};
                newStmts.push(newIfStmt);
                break;
            } case "while": {
                const newLoopBody = DCEForReturn(stmt.body);
                const newWhileStmt = {...stmt, body: newLoopBody};
                newStmts.push(newWhileStmt);
                break;
            } default: {
                newStmts.push(stmt);
                break;
            }
        }
    }

    return newStmts;
}

function optimizeExpr(expr: Expr<[Type, SourceLocation]>): Expr<[Type, SourceLocation]> {
    switch (expr.tag){
        case "binop":
            var optLhs = optimizeExpr(expr.left);
            var optRhs = optimizeExpr(expr.right);
            if(optLhs.tag == "literal" && optRhs.tag == "literal"){
                var A = expr.a;
                var lit = foldBinop(optLhs.value, optRhs.value, expr.op);
                isChanged = true;
                return  { a: A, tag: "literal", value: lit};
            }
            return {...expr, left:optLhs, right:optRhs};
        case "uniop":
           var optExpr = optimizeExpr(expr.expr);
           if(optExpr.tag == "literal"){
               var A = expr.a;
               var lit = foldUniop(optExpr.value, expr.op);
               isChanged = true;
               return {a: A, tag: "literal", value: lit};
           }
           return {...expr, expr: optExpr};
        case "call":
            var optArgs = expr.arguments.map(e => optimizeExpr(e));
            return {...expr, arguments: optArgs};
        case "method-call":
            var optArgs = expr.arguments.map(e => optimizeExpr(e));
            return {...expr, arguments: optArgs};
        default:
            return {...expr};
    }
}

function optimizeStmt(stmt: Stmt<[Type, SourceLocation]>): Stmt<[Type, SourceLocation]> {
    switch (stmt.tag){
        case "assign":
            var optValue = optimizeExpr(stmt.value);
            return {...stmt, value: optValue};
        case "expr":
            var optExpr = optimizeExpr(stmt.expr);
            return {...stmt, expr: optExpr};
        case "if":
            return {...stmt};
        case "return":
            var optValue = optimizeExpr(stmt.value);
            return {...stmt, value: optValue};
        case "while":
            var optCond = optimizeExpr(stmt.cond);
            var optBody = stmt.body.map(stmt => optimizeStmt(stmt));
            return {...stmt, cond: optCond, body: optBody};
        case "field-assign":
            var optValue = optimizeExpr(stmt.value);
            return {...stmt, value: optValue};
        default:
            return {...stmt};
    }
}

function foldBuiltin2(lsh: Literal<[Type, SourceLocation]>, rhs: Literal<[Type, SourceLocation]>, name: string): Literal<[Type, SourceLocation]> {
    switch (name) {
        case "max":
            if (lsh.tag === "num" && rhs.tag === "num")
                return {tag: "num", value: Math.max(lsh.value, rhs.value)};
            return {tag: "none"};
        case "min":
            if (lsh.tag === "num" && rhs.tag === "num")
                return {tag: "num", value: Math.min(lsh.value, rhs.value)};
            return {tag: "none"};
        case "pow":
            if (lsh.tag === "num" && rhs.tag === "num")
                return {tag: "num", value: Math.pow(lsh.value, rhs.value)};
            return {tag: "none"};
        default:
            return {tag: "none"};
    }
}

function foldBinop(lhs: Literal<[Type, SourceLocation]>, rhs: Literal<[Type, SourceLocation]>, op: BinOp): Literal<[Type, SourceLocation]>{
    switch(op) {
        case BinOp.Plus:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "num", value: lhs.value + rhs.value};
        case BinOp.Minus:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "num", value: lhs.value - rhs.value};
        case BinOp.Mul:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "num", value: lhs.value * rhs.value};
        case BinOp.IDiv:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "num", value: Math.floor(lhs.value / rhs.value)};
        case BinOp.Mod:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "num", value: lhs.value % rhs.value};
        case BinOp.Eq:
            if(lhs.tag === "none" || rhs.tag === "none" || lhs.tag === "TypeVar" || rhs.tag === "TypeVar"){
                return {tag: "bool", value: true};
            }  
            return {tag: "bool", value: lhs.value === rhs.value};
        case BinOp.Neq:
            if(lhs.tag === "none" || rhs.tag === "none" || lhs.tag === "TypeVar" || rhs.tag === "TypeVar"){
                return {tag: "bool", value: false};
            }  
            return {tag: "bool", value: lhs.value !== rhs.value};
        case BinOp.Lte:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }   
            return {tag: "bool", value: lhs.value <= rhs.value};
        case BinOp.Gte:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }    
            return {tag: "bool", value: lhs.value >= rhs.value};
        case BinOp.Lt:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }   
            return {tag: "bool", value: lhs.value < rhs.value};
        case BinOp.Gt:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "bool", value: lhs.value > rhs.value};
        case BinOp.And:
            if(lhs.tag !== "bool" || rhs.tag !== "bool"){
                return {tag: "none"};
            }   
            return {tag: "bool", value: lhs.value && rhs.value};
        case BinOp.Or:
            if(lhs.tag !== "bool" || rhs.tag !== "bool"){
                return {tag: "none"};
            }  
            return {tag: "bool", value: lhs.value || rhs.value};
        default:
            return {tag: "none"};
      }
}

function foldUniop(expr: Literal<[Type, SourceLocation]>, op: UniOp): Literal<[Type, SourceLocation]>{
    switch (op){
        case UniOp.Neg:
            if(expr.tag != "num"){
                return {tag: "none"};
            }
            return {tag: "num", value: -1*expr.value};
        case UniOp.Not:
            if(expr.tag != "bool"){
                return {tag: "none"};
            }
            return {tag: "bool", value: !(expr.value)};
        default:
            return {tag: "none"};
    }
}

function DCEForControlFlow(stmts: Array<Stmt<[Type, SourceLocation]>>): Array<Stmt<[Type, SourceLocation]>> {
    var rstmts : Stmt<[Type, SourceLocation]>[] = [];
    for (var stmt of stmts) {
        switch(stmt.tag) {
            case "if":
                if (stmt.cond.tag === "literal" && stmt.cond.value.tag === "bool" && stmt.cond.value.value === true) {
                    if (stmt.thn === null) {
                        break;
                    }
                    const optStmts = DCEForControlFlow(stmt.thn);
                    for (var optStmt of optStmts) {
                        rstmts.push(optStmt)
                    }
                    isChanged = true;
                } else if(stmt.cond.tag === "literal" && stmt.cond.value.tag === "bool" && stmt.cond.value.value !== true) {
                    if (stmt.els === null) {
                        break;
                    }
                    const optStmts = DCEForControlFlow(stmt.els);
                    for (var optStmt of optStmts) {
                        rstmts.push(optStmt)
                    }
                    isChanged = true;
                } else {
                    const ifBody = DCEForControlFlow(stmt.thn);
                    const elseBody = DCEForControlFlow(stmt.els);
                    rstmts.push({...stmt, thn: ifBody, els: elseBody});
                }
                break;
            case "while": 
                if (stmt.tag === "while" && stmt.cond.tag === "literal" && stmt.cond.value.tag === "bool" && stmt.cond.value.value === false) {
                    isChanged = true;
                    rstmts.push({ a: [{tag: "none"}, stmt.a[1]], tag: "pass"});
                } else {
                    const newWhileBody = DCEForControlFlow(stmt.body);
                    rstmts.push({...stmt, body:newWhileBody});
                }
                break;
            default:
                rstmts.push(stmt);
        }
    }

    return rstmts;
}
