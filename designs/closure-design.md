# Design for closure/first-class functions

## test cases

## changes

### AST & IR

See the file diff in the PR for the changes to AST. We don't plan to change the
IR. The diff to `ast.ts` is also provided below.

We first added a `func` variant in the `Type` and the subtyping rules for
functions (the implementation doesn't support subclass checks). To simplify the
implementation, we will initialize functions with a `None` like in ChocoPy.

For statements and expressions, we added AST support for global/nonlocal
statements, nested function definitions, and lambda expressions.

```diff
diff --git a/ast.ts b/ast.ts
index 1c40771..ffbc6a4 100644
--- a/ast.ts
+++ b/ast.ts
@@ -6,6 +6,7 @@ export type Type =
   | {tag: "bool"}
   | {tag: "none"}
   | {tag: "class", name: string}
+  | {tag: "func"; args: Type[]; ret: Type }
   | {tag: "either", left: Type, right: Type }
 
 export type Parameter<A> = { name: string, type: Type }
@@ -26,6 +27,9 @@ export type Stmt<A> =
   | {  a?: A, tag: "field-assign", obj: Expr<A>, field: string, value: Expr<A> }
   | {  a?: A, tag: "if", cond: Expr<A>, thn: Array<Stmt<A>>, els: Array<Stmt<A>> }
   | {  a?: A, tag: "while", cond: Expr<A>, body: Array<Stmt<A>> }
+  | {  a?: A, tag: "closure", func: FunDef<A> }
+  | {  a?: A, tag: "nonlocal", vars: string[] }
+  | {  a?: A, tag: "global", vars: string[] }
 
 export type Expr<A> =
     {  a?: A, tag: "literal", value: Literal }
@@ -38,6 +42,7 @@ export type Expr<A> =
   | {  a?: A, tag: "lookup", obj: Expr<A>, field: string }
   | {  a?: A, tag: "method-call", obj: Expr<A>, method: string, arguments: Array<Expr<A>> }
   | {  a?: A, tag: "construct", name: string }
+  | {  a?: A, tag: "lambda", args: string[], body: Expr<A> }
 
 export type Literal = 
     { tag: "num", value: number }
@@ -52,3 +57,22 @@ export enum UniOp { Neg, Not };
 export type Value =
     Literal
   | { tag: "object", name: string, address: number}
+
+/// checks if t1 is a subtype of t2 (t1 is assignable to t2)
+export function subType(t1: Type, t2: Type): boolean {
+  if (t1.tag === t2.tag) {
+    if (t1.tag === "func" && t2.tag === "func") {
+      return (
+        t1.args.length === t2.args.length &&
+        subType(t1.ret, t2.ret) &&
+        t1.args.every((_, i) => subType(t2.args[i], t1.args[i]))
+      );
+    } else if (t1.tag === "class" && t2.tag === "class") {
+      return t1.name === t2.name;
+    } else {
+      return true;
+    }
+  } else {
+    return t1.tag === "none" && (t2.tag === "class" || t2.tag === "func");
+  }
+}
```

### Value representation & Memory layout

Following the course tutorial "From Nested Functions to Closures", we will
represent a closure with a class (a callable object), where each non-local
variable is a field in the class. The class will have a method called `__call__`,
which will have the original closure body.

The memory layout will be the layout of the class representing the closure.
