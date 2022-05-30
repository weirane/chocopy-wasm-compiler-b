# Comprehensions Conflicts Document


## Lists
```python
print([x for x in Range().new(0, 5, 1)])
print([x for x in [0, 1, 2, 3, 4]])
```
### *expected output*
```python
[0, 1, 2, 3, 4]
[0, 1, 2, 3, 4]
```
### *changes required*
There are two changes required:
* Because List class may not have `next()` and `hasnext()` methods, when the comprehension takes in a list literal as the iterable object, we need to create an iterable class `ListIterable` with the input list literal and implement those two methods for it to help traversing the list.
* We want to support list comprehensions -- converting the comprehension result to a list. Assigning all elements to a list at once is not likely at `lower.ts` level as we don't know what elements, and how many elements will be generated. We hope to see a way to append elements to the end of the list, as we are generating elements one by one.

---

## For loops/iterators
```python
for i in range(...): # for-loop
  ...
(i for i in Range().new(...)) # comprehension
```
### *changes required*
Comprehensions and for-loops share similar goals. Both aim to use an iterator to go over an iterable object (`Range`, `List`, `String`, etc). Both need to call `next()` and `hasnext()` in the implementation. We may talk to each other more about how to make these function calls, and how to handle these iterable types. We may also need to agree on the way to implement the `range()` function.

---

## Strings
```python
print([ch for ch in "string"])
s:str = "hello"
print([ch for ch in s])
```
### *expected output*
```python
['s', 't', 'r', 'i', 'n', 'g']
['h', 'e', 'l', 'l', 'o']
```
### *changes required*
There are two changes required:
* String is now interpreted only as a literal rather than a type. We think it would be better to have strings as a type, so that we can create string objects in the above way, and we can use string as an iterable type in our comprehension.
* On our end, we need to implement a `StringIterable` class to help us obtain the next characters. Again, this might overlap with the for-loop group, so we need to talk about this before moving on to the implementation.

---

## Sets and/or tuples and/or dictionaries
```python
print([elem for elem in {1, 2, 3}])
s:set = {4, 5, 6}
print([elem for elem in s])
print({elem for elem in Range().new(0, 3, 1)})
```
### *expected output*
```python
[1, 2, 3]
[4, 5, 6]
{0, 1, 2}
```
### *changes required*
Similar to the changes required to support lists, we need to:
* Create a `SetIterable`/`DictIterable` class to help iterating over set/tuple/dictionary objects upon receiving them in the comprehension.
* Figure out a way to create set/dictionary objects from set/dictionary comprehensions. Similar to list comprehension, we need to figure out how to assign space on heap to store generated elements, and how to construct the above objects, and at which level.

---

## Destructuring assignment
```python
print([a + b for a, b in [(1, 2), (3, 4)]])
```
### *expected output*
```python
[3, 7]
```
### *changes required*
On our end, instead of using `assign` to assign each element from the iterable object to the iterator, we need to instead use `assign-destructure` (supported by Destructuring Assignment group).

---

## Bignums
```python
x : int = 5
print([3 for _ in Range().new(0, x, 1)])
```
### *expected output*
```python
[3, 3, 3, 3, 3]
```
### *changes required*
**No change is required for them, but we will need to change some details.**

Due to the way they changed the representation of numbers, we will need to update our ```Range``` and ```Generator``` classes with their ```reconstructBigint``` functions, so that each number is now a ```bigint``` type.

---

## Built-in libraries
```python
print([factorial(x) for x in Range().new(0, 4, 1)])
```
### *expected output*
```python
[0, 1, 2, 6]
```
### *changes required*
**No change is required.**

Currently we have no changes required for the built-in group. Currently the built-in group are now only focusing on basic functions like math, time and sleep. Only math functions calls will appear in comprehension expressions, and they are like any other expressions. If parsed correctly, they will be handled properly and won't result in any conflicts.

---

## Import/FFI
### *changes required*
**No change is required.**

Currently we have no changes required for the import/ffi group, because our feature really don't interact much.

---

## Error reporting
```python
(print(x) for x in Range().new(0, 3, 1)]
```
### *expected output*
```python
Error: PARSE ERROR: Comprehension start and end mismatch in line 1 at column 27
```
### *changes required*
**No change is required for them, but we will need to change some details.**

For example, currently our error message doesn't include line number and column number. We will need to modify our files in order to use theirs error reporting interface.

---

## Fancy calling conventions
```python
def f(x : int, y : int = 3) -> int:
    return x + y:
print([f(i) for i in Range().new(0, 3, 1)])
```
### *expected output*
```python
[3, 4, 5]
```
### *changes required*
**No change is required.**

Currently we have no changes required for the fancy calling group. Our group could interact with their group if a fancy function call expression appears in our comprehension expression. Yet fancy call expression is no different from a normal function call expression, if implemented correctly. Thus, there will be no conflicts and no changes required. 

---

## Front-end user interface

### *changes required*
**No change is required.**

Currently we have no changes required for the front-end group. Their work is mostly in ```webstart.ts``` to construct the webpage, which has no overlapping with ours for now.

---

## Generics and polymorphism

### *changes required*
**No change is required.**

Currently we have no changes required for the generics and polymorphism group, because if the monomorphis is implemented properly, it will be passed no different than a normal method call expression to the comprehension.

---

## I/O, files

### *changes required*
**No change is required.**

Currently we have no changes required for the I/O, files group, because our features don't really interact much.

---

## Inheritance
### *changes required*
**No change is required.**

There isn't much overlap between Inheritance and Comprehesions, but we would think about cases where `lhs` of comprehension expressions contains method calls or field lookups/assignments from a class inherited from another class. This scenario should be properly handled by their implemention.

---

## Memory management
### *changes required*
**No change is required.**

There isn't much overlap between Memory Management and Comprehensions. Storing elements generated by List/Set/Dictionary comprehensions relies on the way these group store elements in the memory, so there isn't too much interaction between two groups.

---

## Optimization

### *changes required*
**No change is required.**

Currently we have no changes required for the optimizations group. We basically mapped all changes in ```ast.ts``` to the current ```ir.ts```, without modifying the ```ir.ts```. While the optimization group focused on ```ir.ts```, rather than supporting ```ast.ts```. Thus their work and our work won't conflict with each other for now.

---

## Closures/first class/anonymous functions
```python
def adder(x:int) -> Callable[[int], int]:
  def f(y:int) -> int:
    return x+y
  return f
add1: Callable[[int], int] = None
add1 = adder(1)
print([add1(x) for x in Range().new(0, 3, 1)])
```
### *expected output*
```python
[1, 2, 3]
```
### *changes required*
**No change is required.**

Currently we have no changes required for the closure group. Users can call closures or define lambdas in comprehension expressions, but they are no different from normal call expressions. Thus our features interact fine without conflicts.

