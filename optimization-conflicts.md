# Chocopy Compiler B - Optimization Conflicts

## Bignums
This group change the `Literal: num` to typescript `bigint`, which conflicts with our optimization at the ast level since our implementation uses built-in functions that only accept `number` types. E.g, we use `Math.max`, which does not allow `bigint` as inputs, to fold a `max` binary operation. To accomodate this, we would replace all folding operations with generic-fuctions that accept type as the additional information for compatibility.

Fortunately, the class representation of a `bigint` only occurs at the code generation stage, which does not interact with our optimizations on either `ast` or `ir`, otherwise we wont be able to fold any operations as only constant literals are expected when applying the folding.

## Built-in libraries/Modules/FFI
This group eliminates the identity of built-in functions and make all function calls go through the `{tag:call}` logic. This might obfuscate our constant folding pass as currently we rely on explicit awareness of `built-in` calls, in both `ir` and `ast`, to fold the operation. If built-in functions are still considered to be optimizable candidates, we can utilize the exported built-in list to identify foldable operations and call the function by indexing the list. In terms of efficiency and maintainability, we would appreciate it if this group can export a table `builtin_env` that maps the callname to the index/entry within that built-in list. 

## Closures/first class/anonymous functions
The newly added `closure` will result in a `class` at `ast` level after parsing. We can optimize a closure as a normal class with minor modification. The given test-case below
```python
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
f: Callable[[int], int] = None
f = getAdder(1)
```
will be transformed into a class `Closure1`, where we should be able to propagate `self.a`, `b` and folding the `+` operation with the knowledege that `self.a` is constant. 
```python
class Closure1(Callable[[int], int]):
    a: int = 0
    def __call__(self: Closure1, b: int) -> int:
        return self.a + b
def getAdder(a:int) -> Callable[[int], int]:
    adder: Closure1 = None
    adder = Closure1()
    adder.a = a
    return adder
f: Callable[[int], int] = None
f = getAdder(1)
```
To facilitate this, we may need additional information to indicate that fields inside a **closure** class will not change overtime, which can be injected during the conversion. The same mechanism should be available when implementing the `lambda` functions.

## Comprehensions
As this group stated in their design, their modification on `ast` will be mapped to current `ir` framework, which indicates that our optimization on `ir` will not be affected. We will not support optimization for comprehension at `ast` since the control-flow is more complex at that level. Besides, given that there are a lot of new features to come, our implementation may need significant changes acording to their development in the next milestone.

## Destructuring assignment

When destructuring an assignment, the expression on the left hand side could be affected by constant folding implemented by us. For example,

```python
a, b, c = max(1, 2), min(2, 3), 2+3
```

could be optimized to

```python
a, b, c = 2, 2, 5
```

As a type of statement, destructing could show up in the body of if/while/for/function body, which interact with dead code elimination.

For example, 

```python
def f():
    return 100
    a, b, c = 1, 2, 3

if True:
    pass
    d, e = f(), f()
    pass
```

Could be optimized as,

```python
def f():
    return 100

d, e = f(), f()
```

Despite overlapping, we don't think these features will cause any conflicts, since destructuring does not modify the definition of `expr` or `stmt` inside `ast.ts` and `ir.ts`, but rather adding new tags. To add optimization to destructuring, we only need to add the tags of destructuring assignment inside `optimizeStmt`. In the future, there might also be overlapping after we implemented constant propagation.

## Error reporting

Error reporting team added `SourceLocation` to the `A` tag inside `ast.ts`. There is no overlapping since error reporting team change the code when an error is thrown and our team assume that all of the program to be optimized is totally correct. For example,

```python
a:int = True
if True:
    print(a)
```

This program will never made it to the optimization step, since it will be intercepted and throw an TypeError during type checking. 

With that said, to support printing source code location when throwing an error, the code of our team has integrated the features of `SourceLocation` since last merge.

## Fancy calling conventions

Constant folding could be overlapping with the default values of fancy calling conventions. For example,

```python
def f(x:int = 1 + 2):
    return x
```

Could be optimized as,

```python
def f(x:int = 3):
    return x
```

To support this feature, we need to call `optimizeExpr` to optimize the expression of default values. With that said, the features of this team will not cause conflicts with our implementations of optimization.

## for loops/iterators

The `for` loop team did not modify the original definitions in `ast.ts` and `ir.ts` but rather adding new definitions, so there would be no conflict with our implementation. However, a few overlapping exists for optimization of `for` loops. With our current features, both constant folding and dead code elimination could be added to `for` loops:

```python
for i in range(0, 1+2, 1):
    if True:
        pass
        break
        print(i)
```

The code above could be optimized to

```python
# Constant folding and dead code elimination of if branch
for i in range(0, 3, 1):
    pass
    break
    print(i)
```

Then the code could be further optimized to

```python
# Dead code elimination for pass statement and statements after break statement
for i in range(0, 3, 1):
    break
```

Then the code could be completely removed since it does nothing. These features will require us to expand our optimization features, ideally adding a new function specially for `for` loops. There would be more overlapping after we implement constant propagation.

## Front-end user interface
The user interface is implementd on the top of the compiler. It would mainly modify the stuff in webstart.ts which is used to construct the web page. And we implement the optimization process by modifying the ast and the ir, which would not conflict with the user interface. We notice that our group and front-end group both modified the repl.ts. However, there are no overlap of the content where we both have modified.
## Generics and polymorphism
The Generics team has added a new tag `TypeVar` to Literal in ast.ts, which would cause compiliance error with in our optimize_ast.ts:
```javascript
case BinOp.Eq:
    if(lhs.tag === "none" || rhs.tag === "none"){
        return {tag: "bool", value: true};
    }  
    return {tag: "bool", value: lhs.value === rhs.value};
case BinOp.Neq:
    if(lhs.tag === "none" || rhs.tag === "none"){
        return {tag: "bool", value: false};
    }  
    return {tag: "bool", value: lhs.value !== rhs.value};
```
And they have also modified the ast of `Class` and expression `call` by adding an optional generic type arguments to support generic feature. However, They have removed the generics in remove-generics.ts which replace each generic class with its specifications, which leaves the ir level unchanged. So there would be no conflict in our optimize_ir.ts. As we plan to implemente optimization mainly in ir level, we would not interact with generic team.
## I/O, files
The I/O team mainly implemented their feature in javascript functions and import them to be called in the WASM code. Their work is to implement `File` class in python with methods as follows:
```python
class File(object):
    def __init__(self : File):
    def read(self : File) -> int:  
    def write(self : File, s : int) -> int:
    def tell(self : File) -> int:
    def seek(self : File, pos : int):
    def close(self : File):
```
And they have made no modifications on ast or ir. So we would optimize the File class's definition and method call with the same routine as other classes. 
## Inheritance
The inheritance team have modified the ast as well as the ir to support the super class feature. They added a `supers` filed in `Class<A>` in both ast and ir and added a new expression `call_indirect` in ir to implement method override. We needn't to do extra adaptation in regard to their changes. We would just do optimization in classes with superclass and their overrided methods as normal classes. For example:
```python
class Person(object):
   age:int = 0
   def new(self:Person,age:int) -> Person:
       self.age = age
       return self
       
class Employee(Person):
   def new(self:Employee,age:int) -> Person:
       self.age = age
       return self
 
emp1: Person = None
emp2: Person = None
emp1 = Person().new(12+13)
emp2 = Employee().new(11+12)
```
we would just focus in performing optimization on the methods `new`'s arguments.

## Lists
The lists team add `type` with `{tag: "list", type: Type}` and added `{  a?: A, tag: "listliteral", elements: Array<Expr<A>> }` to `stmt`, which would not cause conflicts. For lists, we can also use our implementation on it.
For example:
```python
s1:str = "ab"
s2:str = "abc"
print( s1 == s2)
```
After optmization:
```python
s1:str = "ab"
s2:str = "abc"
print(False)
```
## Memory management
Since the memory management team only made minor change at IR level (i.e. change `{a?: A, tag: "wasmint", value: number }` to `{ a?: A, tag: "wasmint", value: number, is_pointer?: boolean }`) and didn’t made any changes at ast level, we probably wouldn’t have any conflicts. So far, we are planning to do most of the optimizations at IR level. As a result, there may be no conflicts in the future. 
## Optimization
## Sets and/or tuples and/or dictionaries
The sets team extended `Type` with `{tag: "set", valueType: Type }` and added `{  a?: A, tag: "bracket", values: Array<Expr<A>>}` to `Expr` rather than modifying `ast.ts`. So there will not conflict with our implementation. Constant folding can be used on set with our implementation. For example:

```python
A :int = 0
s: set = set()
s.add(a)
s.add(a+1)

```
After optmization:
```python
A :int = 0
s: set = set()
s.add(0)
s.add(1)

```
    
## Strings
The strings team changed `ast.t`, add a new field `{ tag: "str", value: string}` in `literal`, and they pass string literals in the compiler with this field. This won’t conflict our code. However, it will cause compiliance error in our `optimize_ast.ts` since we haven’t taken strings into consideration yet. We need to add some features for constant folding to include the strings scenarios.
Constant folding could be overlapping with strings operations after we deal with conflicts. For example:
```python
s1:str = "ab"
s2:str = "abc"
print( s1 == s2)
```
After optmization:
``` python
s1:str = "ab"
s2:str = "abc"
print(False)
```

