import { Type, Program, SourceLocation, FunDef, Expr, Stmt, Literal, BinOp, UniOp, Class} from './ast';
import * as IR from './ir';

export function optimizeIr(program: IR.Program<[Type, SourceLocation]>) : IR.Program<[Type, SourceLocation]> {
    const optFuns = program.funs.map(optimizeFuncDef);
    const optClss = program.classes.map(optimizeClass);
    const optBody = program.body.map(optBasicBlock);
    return { ...program, funs: optFuns, classes: optClss, body: optBody };
}

const bfoldable = ["num", "bool", "none"];
const ufoldable = ["num", "bool"];
function bigMax(a: bigint, b: bigint): bigint {
    return a > b ? a : b;
}
function bigMin(a: bigint, b: bigint): bigint {
    return a < b ? a : b;
}
function bigPow(a: bigint, p: bigint): bigint {
    return a ** p;
}
function bigAbs(a: bigint): bigint {
    return a < 0 ? -a : a;
}

function optBasicBlock(bb: IR.BasicBlock<[Type, SourceLocation]>): IR.BasicBlock<[Type, SourceLocation]> {
    return {...bb, stmts: bb.stmts.map(optimizeIRStmt)};
}

function optimizeFuncDef(fun: IR.FunDef<[Type, SourceLocation]>): IR.FunDef<[Type, SourceLocation]> {
    return {...fun, body: fun.body.map(optBasicBlock)};
}

function optimizeClass(cls: IR.Class<[Type, SourceLocation]>): IR.Class<[Type, SourceLocation]> {
    return {...cls, methods: cls.methods.map(optimizeFuncDef)};
}

function optimizeIRStmt(stmt: IR.Stmt<[Type, SourceLocation]>): IR.Stmt<[Type, SourceLocation]> {
    switch (stmt.tag) {
        case "assign":
            return {...stmt, value: optimizeIRExpr(stmt.value)};
        case "expr":
            return {...stmt, expr: optimizeIRExpr(stmt.expr)};
        case "return":
        case "pass":
        case "ifjmp":
        case "jmp":
        case "store":
            return stmt;
        default:
            return stmt;
    }
}

function optimizeIRExpr(expr: IR.Expr<[Type, SourceLocation]>): IR.Expr<[Type, SourceLocation]> {
    switch (expr.tag) {
        case "value":
            return expr;
        case "binop": 
            if (bfoldable.includes(expr.left.tag) && bfoldable.includes(expr.right.tag)) 
                return {tag: "value", value: foldBinop(expr.left, expr.right, expr.op), a: expr.a};
            return expr;
        case "uniop":
            if (ufoldable.includes(expr.expr.tag)) 
                return {tag: "value", value: foldUniop(expr.expr, expr.op), a: expr.a};
            return expr;
        case "call":
            return expr;
        case "alloc":
            return expr;
        case "load" :
            return expr;
        default:
            return expr;
    }
}

function foldBuiltin2(lhs: IR.Value<[Type, SourceLocation]>, rhs: IR.Value<[Type, SourceLocation]>, callName: string): IR.Value<[Type, SourceLocation]> {
    if (lhs.tag !== "num" || rhs.tag !== "num") 
        return {tag: "none", a: lhs.a};
    switch (callName) {
        case "max":
            return {tag: "num", value: bigMax(lhs.value, rhs.value), a: lhs.a};
        case "min":
            return {tag: "num", value: bigMin(lhs.value, rhs.value), a: lhs.a};
        case "pow":
            return {tag: "num", value: bigPow(lhs.value, rhs.value), a: lhs.a};
        default:
            return {tag: "none", a: lhs.a};
    }
}

function foldBinop(lhs: IR.Value<[Type, SourceLocation]>, rhs: IR.Value<[Type, SourceLocation]>, op: BinOp): IR.Value<[Type, SourceLocation]> {
    switch(op) {
        case BinOp.Plus: {
            if (lhs.tag != "num" || rhs.tag != "num") {
                return {tag: "none", a: lhs.a};
            }
            return {tag: "num", value: lhs.value + rhs.value, a: lhs.a};
        }
        case BinOp.Minus:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }  
            return {tag: "num", value: lhs.value - rhs.value, a: lhs.a};
        case BinOp.Mul:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }  
            return {tag: "num", value: lhs.value * rhs.value, a: lhs.a};
        case BinOp.IDiv:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }  
            // bigint do intDiv
            return {tag: "num", value: lhs.value / rhs.value, a: lhs.a};
        case BinOp.Mod:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }  
            return {tag: "num", value: lhs.value + rhs.value, a: lhs.a};
        case BinOp.Eq:
            if(lhs.tag === "none" || rhs.tag === "none"){
                return {tag: "bool", value: true, a: lhs.a};
            } else if(lhs.tag === "id" || rhs.tag === "id") {
                return {tag: "none", a: lhs.a};
            }
            return {tag: "bool", value: lhs.value === rhs.value};
        case BinOp.Neq:
            if(lhs.tag === "none" || rhs.tag === "none"){
                return {tag: "bool", value: false, a: lhs.a};
            } else if(lhs.tag === "id" || rhs.tag === "id") {
                return {tag: "none", a: lhs.a};
            } 
            return {tag: "bool", value: lhs.value !== rhs.value, a: lhs.a};
        case BinOp.Lte:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }   
            return {tag: "bool", value: lhs.value <= rhs.value, a: lhs.a};
        case BinOp.Gte:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }    
            return {tag: "bool", value: lhs.value >= rhs.value, a: lhs.a};
        case BinOp.Lt:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }   
            return {tag: "bool", value: lhs.value < rhs.value, a: lhs.a};
        case BinOp.Gt:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }  
            return {tag: "bool", value: lhs.value > rhs.value, a: lhs.a};
        case BinOp.And:
            if(lhs.tag !== "bool" || rhs.tag !== "bool"){
                return {tag: "none", a: lhs.a};
            }   
            return {tag: "bool", value: lhs.value && rhs.value, a: lhs.a};
        case BinOp.Or:
            if(lhs.tag !== "bool" || rhs.tag !== "bool"){
                return {tag: "none", a: lhs.a};
            }  
            return {tag: "bool", value: lhs.value || rhs.value, a: lhs.a};
        default:
            return {tag: "none", a: lhs.a};
      }
}

function foldUniop(val: IR.Value<[Type, SourceLocation]>, op: UniOp): IR.Value<[Type, SourceLocation]>{
    switch (op){
        case UniOp.Neg:
            if(val.tag != "num"){
                return {tag: "none", a: val.a};
            }
            return {tag: "num", value: BigInt(-1) *val.value, a: val.a};
        case UniOp.Not:
            if(val.tag != "bool"){
                return {tag: "none", a: val.a};
            }
            return {tag: "bool", value: !(val.value), a: val.a};
        default:
            return {tag: "none", a: val.a};
    }
}
