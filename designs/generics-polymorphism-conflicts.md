# Project Merge Update

How generics conflicts with the following features:

## Bignums
Generics doesn't conflict much with this. Most of the changes for this seem to be in the IR and lowering phase, 
while generics work is in the AST and between parsing and typechecking. At this point, bignums should just be viewed as any other type.
Example program with the two features:
```python
T: TypeVar = TypeVar('T')

class Printer(Generic[T]):
    def print(self: Printer[T], x: T):
        print(x)

pInt: Printer[int] = None
pInt = Printer[int]()
pInt.print(99999999999999999999999999999999)
```
This tests that bignums can be passed as a generic argument.

## Built-in libraries
This somewhat depends on what libraries this team wants to implement. Last week, they mostly wrote new math functions and a system time function. These don't conflict with generics at all because they are just new functions defined before the program. They also all use basic int types. Here's an example program with the two features (as of now, this class would only be able to be compiled with T=number): 
```python
T: TypeVar = TypeVar('T')

class Printer(Generic[T]):
    def print_pow(self: Printer[T], x: T, y: T):
        print(pow(x, y))

pInt: Printer[int] = None
pInt = Printer[int]()
pInt.print_pow(2, 3)
```
It's not possible to create a program that could be an issue because none of the standard functions added so far are generic.

## Closures/first class/anonymous functions
Initially it seemed like closures might conflict a lot with generics because the syntaxes were similar, but I think the main thing 
to differentiate whether a type is a generic class or closure is the keyword `Callable`. However, one thing the syntax for Callables 
supports that the syntax for generics doesn't is a variadic type syntax to represent a variable number of arguments. This would cause the following program to crash the compiler:
```python
# Syntax would be like this, or maybe like in: https://peps.python.org/pep-0646/
Args: [TypeVar] = [TypeVar]('Args')

class CallWrapper(Generic[Args]):
    fun: Callable[Args, None] = None
    def call(self: CallWrapper[Args], x: Args):
        call(x)

wrapper: CallWrapper[[int, bool]] = None
wrapper = someFun
wrapper.call(10, False)
```
One way the template specialization pass could support variadic templates would be to:

1. Create a new version of `CallWrapper(Generic[Args])` with the proper number of type vars (ex. change it to `CallWrapper(Generic[U, V])`)
2. Run the normal pass which monomorphizes U and V.

## Comprehensions
This shouldn't conflict too much with generics. Because type checking is run after the monomorphize pass, any issues should be caught then.
```python
T: TypeVar = TypeVar('T')

class Printer(Generic[T]):
    def print(self: Printer[T], x: T):
        print(x)

pInt: Printer[int] = None
pInt = Printer[int]()
for i in range(10):
    pInt.print(i)
```
This tests that a generic method can be called from within a for loop. The class should be monomorphized so the comprehensions code should just see a normal method call statement.

## Destructuring assignment
Currently the test cases for destructuring assignments seem pretty simple so I don't think there's much conflict. There's no new types, just a new `assign-destr` statement. Here's a representative program:
```python
T: TypeVar = TypeVar('T')

class Get(Generic[T]):
    def x(self: Zipper[T], x: T, y: T):
        a, b = x, y
        return a

    def y(self: Zipper[T], x: T, y: T):
        a, b = x, y
        return b

g: Get[int] = None
g = Get[int]()
a, b = g.x(1, 2), g.y(1, 2)
```
The destructring assignment group is waiting on work from the lists, tuples, and sets groups, so currently these are not supported. Right now, the lack of ways to destructure an object keeps any representative programs pretty simple.

## Error reporting
The main changes here are internal: I had to change the inputs and outputs of my `remove-generics.ts` pass from `Program<null>` to `Program<SourceLocation>`. I would also need to use their new `TypeCheckError()` interface and add parsing errors with `ParseError()`.
Here's a representative program: 
```python
T: TypeVar = TypeVar('T')

class Get(Generic[T]):
    def x(self: Zipper[T], x: T, y: T):
        a, b = x, y
        return a

    def y(self: Zipper[T], x: T, y: T):
        a, b = x, y
        return b

g: Get[int] = None
g = Get[bool]]()
a, b = g.x(1, 2), g.y(1, 2)
```
Expected output: `Method call type mismatch: ... at line 13 column 14)`.

## Fancy calling conventions
This team is implementing default arguments right now. Their single addition to the AST is a `defaultValue` field on the `Parameter` type. This shouldn't conflict with generics at all. Here's an example program with the two features:
```python
T: TypeVar = TypeVar('T')

class Printer(Generic[T]):
    def print(self: Printer[T], x: T = 10):
        print(x)

pInt: Printer[int] = None
pInt = Printer[int]()
pInt.print()
```
This program shows that type checking should work once T has been replaced with an int

## For loops/iterators
This team is making a lot of changes to both the AST and IR. The AST changes include a new for statement, break, and continue statements. These shouldn't affect genrics that much. Here's an example program with the two features:
```python
T: TypeVar = TypeVar('T')

class Printer(Generic[T]):
    def print(self: Printer[T], x: T = 10):
        print(x)

pInt: Printer[int] = None
pInt = Printer[int]()
pInt.print()

i : int = 0
for i in range(5):
    pInt.print(i*100)
    continue
```
This checks that methods from generic classes can be called from inside a for loop.

## Front end user interface
One idea for the user interface to enhance code using generics would be to show the specialized type of a function or field using generics. Sometimes I forget the exact method return type or field type for a specialized class (specifically in rust or c++ whether a type is a value/reference/const reference). The user interface could run the `remove-generics.ts` pass and show the types when hovering over a method call
or field accessor. 

As an example, in the following program: 

```python
T: TypeVar = TypeVar('T')

class Printer(Generic[T]):
    def print(self: Printer[T], x: T = 10):
        print(x)

pInt: Printer[int] = None
pInt = Printer[int]()
pInt.print(10)
```
Hovering over `pInt.print(10)` would show that print takes an int parameter for this specialization.

## File I/O
Files work mostly within the existing set of language features, so they don't pose much of a problem for generics. Here's an example of a program using both features:

```python
T: TypeVar = TypeVar('T')

class Printer(Generic[T]):
    def print(self: Printer[T], x: T = 10):
        print(x)

pInt: Printer[int] = None
pInt = Printer[int]()

f : File = None
f = open('test', 'rb')

pInt.print(f.read())
```

## Inheritance
The main conflict with inheritance is that we both have to read the superclasses for an object. I need to read it to find the 'Generic' class and read off the TypeVars used, while the Inheritance group reads it to get the super classes for an class. We decided to have a `traverseGenerics` function in parse to read off the TypeVars in the type list, and the Inheritance team will use a function like `traverseParents` to read off the parent classes for a class definition. They will be stored in the `generics` and `parents` fields of `ClassDef` respectively. 

In the future, it would also be nice if I allowed generic parent classes in a class definition. To implement this, I would modify the code  changing all mentions of (for example) `Box[int]` to `Box_int` I would do it in the parent class list too.

Hopefully, we could allow a class having both generics and parents like so:
```python
T: TypeVar = TypeVar('T')

class List(Generic[T]):
    def get(self : List[T], idx: int) -> T:
        return None
class Empty(Generic[T], List[T]):
    def get(self : Empty[T], idx: int) -> T:
        return None
class Link(Generic[T], List[T]):
    val: T = 0
    next: List[T] = None
    def get(self : Link[T], idx: int) -> T:
        if idx == 0:
            return val
        else:
            return self.get(idx + 1)
    def new(self: Link[T], val: T, next: List[T]) -> Link[T]:
        self.val = val
        self.next = next
        return self

def Int(object):
    val: int
    def new(self: Int, val: int):
        self.val = val

five: Int = None
three: Int = None
l : List[Int] = None

five = Int().new(5)
three = Int().new(3)

l = Link[Int]().new(five, Link[Int]().new(three, Empty[Int]()))
print(l.get(1))
```
This program should print 3. It would also require that I implement generic fields, which I plan to do for next milestone

## Lists
The lists team simply added a new list type to the AST and a new list literal. One issue is that once the lists code is merged, I would
have to allow TypeVars as a type for arrays:
```python
T: TypeVar = TypeVar('T')

class ListWrapper(Generic[T]):
    data: [T]
```
This code would also require that I implement generic fields, which is planned for the next milestone. To get this working, I:
1. First need to implement generic fields,
2. When I copy `ListWrapper` into specializations (like `ListWrapper_int`), add into the code a special case for when the field is a list and the list type uses the TypeVar `T`.

## Memory management
Specialized classes are treated as regular classes after `remove-generics`, so there shouldn't be much conflict with memory management since it should just treat them as another class.
```python
T: TypeVar = TypeVar('T')

class C(Generic[T]):
  i: T = 0

def foo(c: C):
  test_refcount(c, 2)

c: C[int] = None
c = C[int]()
test_refcount(c, 1)
foo(c)
test_refcount(c, 1)
```
This code tests that the ref counter - a central feature being developed by the memory management team - works with generic classes.

## Optimization
The optimization team is mostly working in the IR and lowering pass, so there should not be too much conflict. They are also mostly working on transforming bodies/basic blocks, so there shouldn't be many modifications to higher-level constructs like functions or classes when this code is run. 

The optimizer should optimize the calculations in the `calc()` method below
```python
T: TypeVar = TypeVar('T')

class Calculator(Generic[T]):
  def calc(self: Calculator[T], x: T, y: T) -> T:
    return a = 2 * (x+y) + 3 * (y + x) + 5 * (x+y)

x:int = 1
y:int = 2
a:int = 0
c: Calculator[int] = None
c = Calculator[int]()

a = c.calc(x, y, z)
```
to:
```python
...
e = x + y
return 2 * e + 3 * e + 5 * e
...
```
This code tests that the optimizer still works on generic types. The `remove-generics` pass should change all instances of T to int, and the optimizer should worlk as it would for ints.

## Sets and/or tuples and/or dictionaries
The sets team is just adding two things to the AST: a new set type and "bracket" expr for accessing values. The conflicts with this are pretty similar to the conflicts with Lists: once I get generic fields working, I will need to add support for having type vars in the type argument. An example of a program using generic sets is: 
```python
T: TypeVar = TypeVar('T')

class SetWrapper(Generic[T]):
    data: set[T]
```
The implementation would also be similar to the lists implementation. To get this working, I:
1. First need to implement generic fields,
2. When I copy `SetWrapper` into specializations (like `SetWrapper_int`), add into the code a special case for when the field is a set and the set type uses the TypeVar `T`.

## Strings
Strings are just another type, so it should't need any special treatment from the generics system. A program using both features might look like:
```python
T: TypeVar = TypeVar('T')

class Printer(Generic[T]):
    def print(self: Printer[T], x: T):
        print(x)

p: Printer[str] = None
p = Printer[str]()
s:str = "asdf"
print(p.print(s))
```
This tests that type vars can be specialized as strings.