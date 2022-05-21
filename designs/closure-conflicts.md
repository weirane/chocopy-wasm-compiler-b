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
