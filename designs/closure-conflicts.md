# Analysis of potential conflicts with closures. week 8

## Bignum

There is no conflict between closures and bignum, as the bignum feature basically replaces the number type by the bignum class. Our closure feature doesn't interfere with newly-defined classes and functions.

For example, the function below still works when they replace int with their bignum class.

```python
def f(a:int) -> Callable[[int], int]:
  def g(b:int) -> int:
    return a+b
  return g
g: Callable[[int], int] = None
g = f(10000000000000000000000000000000000000000)
g(999999999999999999999999999999999999)
```

## Built-in libraries 

Built-in functions that don't take functions as arguments will have no conflicts with us, because our approach will work with imported objects.

But higher order functions like `map` and `reduce` will require some collaboration, if they are imported javascript functions. I propose multiple ways to solve this issue.

### (1) Let the built-in library team handle this

On a high level, I would imagine that our group will implement closures as we planned, and the built-in library group shall base on our code to make builtin higher order functions like `map` being able to take closures as parameters and run them. 

```python
def g(a:int) -> int:
  return a*a
map(g, [1,2,3])
```

In this example, as usual, we will make g an instance of the closure-turned-class, and their `map` function needs to be able to take a Callable[[int], int] as the first argument. Their `map` function also needs to call our g closure.

### (2) Let the closure team handle this

Another way to solve this problem is to let us define the higher order functions using python instead of javascript.

### (3) Let the module team handle this

Yet another way to solve this problem is to let the module team handle this. Since the modules are written in python, it is easier for us to do closure-related work in them. (See the example in the next section)

## Modules

There is no conflict between closures and module imports. I quote from them

> the parser does most of the work and concatenates everything together. We basically get treat the whole thing as a giant program,

if some of their imports contain closure-related code, it is fine, because our parser will translate closures in "the giant program" into classes as well.

```python
from functools import reduce
primes = [2, 3, 5, 7, 11, 13]
reduce((lambda x, y: x + y), primes, 1)
```

In this example, the `functools` module and the code above will be merged into "a giant program". For the higher-order function `reduce`, as long as it is written in correct CompilerB syntax, our code should correctly let it accept `Callable`s as parameters and call them whenever needed.

The above example can be used as a test case.

## Comprehension

There is no conflict between closures and comprehension. The comprehension feature basically adds a new of expression, as I quote from their doc:

```
(<expr> for <id> in Range().new(<start>, <end>, <step>) if <cond>)
```

The user can feel free to call closures or define new lambdas in `<expr>` and `cond`. For example,

```python
def f(a:int) -> Callable[[int], int]:
  def g(b:int) -> int:
    return a+b
  return g
add3: Callable[[int], int] = None
add3 = f(3)
[add3(x) for x in Range().new(0, 10, 1) if x & 1 == 1]
```

This would be a great test case for both our groups to test closures or construction of lambdas in a comprehension context.

## Destructing assignment

There is no conflict between closures and destructing assignment. They added a new statement which basically assigns a list of expressions to a list of names or fields. Our closures are designed to be first-class citizens and henceforth can be used in a destructing assignment as well.

```python
def f(a:int) -> Callable[[int], int]:
  def g(b:int) -> int:
    return a+b
  return g

g1: Callable[[int], int] = None
g2: Callable[[int], int] = None
g1, g2 = f(1), f(2)
```

This would be a cool test case, too

## Error reporting

There is no conflict between closures and error reporting. It is our job to use their SourceLoation when turning closures into classes. Here is an example.

Consider the user code below:

```python
def f(a:int) -> Callable[[int], int]:
  def g(b:int) -> int:
    return a+False    # type error
  return g
```

This will get translated into this:

```python
class Closure1(Callable[[int], int]): # generated
  a:int = 0            # generated
  def __call__(b:int): # the original nested function
    return a+False     # body of the original nested function

def f(a:int):
  g: Closure1 = None # generated
  g = Closure1()     # generated
  g.a = a            # generated
  return g
```

The generated `__call__` function will retain the source location of the original nested function, so the error inside can still be reported.

## Fancy calling conventions

We have conflict at the subtyping rules for functions, as we need to take
default arguments into account. We may need to add the number of default
arguments into the `func` variant of `Type` in `ast.ts` to facilitate the check.

```python
def f(a: int, b: int=0):
    pass

x: Callable[[int], None] = None
# f should be assignable to x
```

## for loops/iterators

Our groups don't interact much.

```python
def add(a: int) -> Callable[[int], int]:
    i: int = 0
    for i in range(5):
        def g():
            return i
        a = a + g()
    return a + g()
```

Since our closures are all translated to class definitions and initializations,
there will not be more interactions.

## Front-end user interface

Our groups interact when we want to print functions. If we want to print the
signature of the function, we will need to modify the `stringify` function in
`outputrender.ts` to add a case statement for functions. It should be a
straightforward change.

```python
def f(a: int) -> int:
    return a

print(f)  # maybe render something like "int -> int"
```

## Generics and polymorphism

## I/O, files

Our groups don't interact much.

```python
def h() -> Callable[[], File]:
    def g() -> File:
        return open(0)
    return g
```

Since our closures are all translated to class definitions and initializations,
the code will work just as files and classes will work together.

## Inheritance

We don't have much conflict with the inheritance group, but we depend on their
feature because we generate a different class for each closure, but they all
inherit from a `Callable` class so that they can be assigned to each other (if
their function signatures match).

As the inheritance group works on the relations of classes and our work just
transforms closure statements to class definitions and initializations, there is
no conflict between us.
```python
class List(object):
    def sum(self : List) -> int:
        return 1 // 0
class Empty(List):
    def sum(self : Empty) -> int:
        return 0
class Link(List):
    val : int = 0
    next : List = None
    def sum(self : Link) -> int:
        def g() -> int:  # <== closure
            return self.next.sum()
        return self.val + g()
    def new(self : Link, val : int, next : List) -> Link:
        self.val = val
        self.next = next
        return self
```


## List
the implementation of this feature basically extends the ast with 'list' data
type. list type holds an address that points to certain memory in the heap. Each element of that list is stored as consecutive 4-byte blocks. There is
no conflict between our implmentations because each closure is considered as a class. If we initialize a list of closures, we need to add the address of that closure to
the list. Since we didn't modify the IR part, there is no IR conflict between our design and list design.

Example:

```python
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
f: Callable[[int], int] = None
a: [Callable[[int], int]] = None
f = getAdder(1)
a = [f]
```

## Memory management

In their implementation, they customized alloc in the lower.ts when
initializing a new object and dynamically checks the reference count of each object.
Our project already converted the closure into classes and each instance of closure
is the same as the regular object. Since our changes are done in AST/TC part while
memory mangagement are processed in IR/Lower part, there is no conflict between our
implmentations.

Example:

```python
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
f: Callable[[int], int] = None
f = getAdder(1)
test_refcount(f, 1)
```

## Optmization

There is no overlap between our design a and the optimization. We
preprocessed all the closures/callable before the type checker and converted all the
closures into classes while optimization is done mainly in the type checking and
lower stages. Thus, optimizing closure is the same as optimizing class.

Example:

```python
# before optimization
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
        print(a + 5)
    return adder
f: Callable[[int], int] = None
f = getAdder(1)
f(2)

# before optimization
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
f: Callable[[int], int] = None
f = getAdder(1)
f(2)
```

## Sets and/or tuples and/or dictionaries
This group implemented set by calculating the hash of each variable/literal. Similar to the list, our closure is considered as class. Each callable
object is referenced to its address in the heap. The hash of closure will be treated the same as the hash of class/object.

Example:

```python
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
f: Callable[[int], int] = None
set_1 : set[int] = None
f = getAdder(1)
set_1 = {f}
set_1.remove(f)
```

Strings: The string in the compilerB is designed as a class type. Each variable that
stores a string bascically holds a pointer to that string object in the heap. In their
AST design, they only extended the data type string. There is no conflict between
our groups because there is no overlap between closure and string implmentation. The closure body will just treat string as a new data type.

Example:

```python
def getStr(a:int) -> Callable[[int], int]:
    def adder(b: str) -> str:
        return a + b
    return adder
f: Callable[[str], int] = None
f = getAdder("some string ")
print(f("other string"))
```

The result should be 'some string other string'
