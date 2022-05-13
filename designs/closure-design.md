# Design for closure/first-class functions

## Week7 Design

### AST & IR

We first added a `func` variant in the `Type` and the subtyping rules for
functions (the implementation doesn't support subclass checks). To simplify the
implementation, we will initialize functions with a `None` like in ChocoPy.

For statements and expressions, we added AST support for global/nonlocal
statements, nested function definitions, and lambda expressions.

### Value representation & Memory layout

Following the course tutorial "From Nested Functions to Closures", we will
represent a closure with a class (a callable object), where each non-local
variable is a field in the class. The class will have a method called `__call__`,
which will have the original closure body.

Take the third test case as an example: The user enters the code below

```python
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
f: Callable[[int], int] = None
f = getAdder(1)
f(2)
```

After parsing, before type-checking, our `translateClosuresToClasses` function
will morph the AST by doing the following:

- add class definition for each closure
  - this class is a subclass of the corresponding callable type.
  - (so that different closures can be assigned to the same callable type. eg. Callable[[int], int])
- change all callsites of that closure to a method call
- change the place where the closure is defined to object instantiation

This functionality is implemented in `closure.ts` and called in the first line
of `tc`. This is what the transformed AST looks like:

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
f.__call__(2)  # need inheritance to work
```

Hence, the value representation of a closure at runtime is the address of the
closure class instance. And the ability to call a closure requires dynamic dispatch to work.

By Week 7 May 12, we've already completed `closure.ts` (that transforms the
    AST) in the aforementioned manner. Currently we only focused on 1-layer of
nested functions that do not mutate non local variables. The bulk of our work
is in `closure.ts`. There are some small changes in `type-check.ts` to make
closures assignable to the callable type. 

We passed the majority of the unit tests in `closure.test.ts` 
(Try them using `npm test -- --grep closure`)
The only tests missing are the ones that call a closure, which requires dynamic
dispatch to work properly. One inheritance and dynamic dispatch are merged,
minimal changes are required to make all test cases pass.

## test cases

```python
# parse callable, and lower that to a class in the IR
# pass type check
f: Callable[[int], int] = None  
```

```python
# parse callable, and lower that to a class in the IR
# type error
f: Callable[[int], int] = None  
g: Callable[[bool], int] = None
f = g
```

```python
# `is` should work on the callable object
# expect True
f: Callable[[int], int] = None  
f is None 
```

```python
# parse and type check closure
# type check 
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
# the remaining tests all require this definition at top
```

```python
# the returned function can be called
# expect: 3
getAdder(1)(2) 
```

```python
# assign a closure to a global variable
# pass type check
f: Callable[[int], int] = None
f = getAdder(1) 
```

```python
# assign and call
# expect 3
f: Callable[[int], int] = None
f = getAdder(1) 
f(2) 
```

```python
# the returned closures are different objects
# expect false
f: Callable[[int], int] = None
  g: Callable[[int], int] = None
f = getAdder(1) 
g = getAdder(1) 
f is g
```

```python
# pass the same closure around and use `is` operator
# expect true
f: Callable[[int], int] = None
g: Callable[[int], int] = None
f = getAdder(1) 
g = f
f is g
```

```python
# lexical scoping
# expect 3
a: int = 10
f: Callable[[int], int] = None
f = getAdder(1) 
f(2) 
```


