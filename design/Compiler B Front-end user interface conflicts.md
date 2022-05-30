# Conflict Evaluation

## 1. Bignums

For the bignums, they change every number fields in ast and ir to bigint. 

The confict might exist when we want to demonstrate the int fields of an object because we are not sure weather the int is wasm int or the bigint. We need to use the function `reconstructBigint` to get the number of that fields.

## 2. Built-in libraries/Modules/FFI

The built-in team integrated built-in libs into `builtinlib.ts`, accordingly they changed the interface of lib such as `max` in `webstart.ts`.

A potential conflict may occur in the interface part of such lib in `webstart.ts`. To resolve the conflict, we just need to simply apply their modifications in `webstart.ts`.

## 3. Closures/first class/anonymous functions

The closure team represented a closure with a class, where each non-local variable is a field in the class. The class will have a method called `__call__`,
which will have the original closure body. One of the typical examples is:

```python
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
f: Callable[[int], int] = None
f = getAdder(1)
f(2)
```

As we can see, there is no obvious interaction between the front end and closure. However, if we want to print the closure and its details on the front end, we may need to modify our `outputrender.ts` file to support that feature.

## 4. comprehensions

In `repl.ts`, they appended the source code of buildin classes to the original source code,
and then replace the `source` with `sourceCode` which includes buildin classes.

Since their change will not affect the other part of source code, we can resolve the conflict
by using their modification.

## 5. Destructuring assignment

Destructuring assignment team mainly changes files in the ast and type checker as well as parsing parts. Below is a typical exapmle of destructuring assignment.

```python
def f(x:int)->int:
    return x

a:int = 0
b:int = 0
(a,b) = (5,f(6))

print(a)
print(b)
```

And the changes Destructuring Assignment team made in the Ast, Ir, Type Checker and Parser will not influence front-end functionalities. And the parse error and type error they added can be thrown out to the front-end and be displayed.

## 6. Error reporting

Our group works with error reporting group in a series connection way, and as we use the interfaces provided by error_reporting.ts implemented by them to render error output, there are not conflicts between our implementation currently. Though we have updated our render error methods in the outputrender.ts, the method still accepts the argument and the functionality is as before. Below is a typical example:

```python
def f(c):
    print(3)

f(2)
```

The output is as expected:"Error: PARSE ERROR: Missed type annotation for parameter c in line 1 at column 8 def f(c):". And the feature to display line number and column number may help us better design function in displaying lint in the front-end.

## 7. Fancy calling conventions

Fancy calling conventions group mainly deals with arguments defined and passed into function or method calls. Typical example is as below:

```python
def getNum(x : int = 6) -> int:
   return x

a, b = 5, getNum()
print(b)
```

And they changes files mainly in the process of parsing, type checking, or lowering, so front-end does not have much overlap with fancy calling.
Some minor conflicts may occur when we print class object with default values and we can just make small modifications to print default values in a more fancy way.

## 8. for loops/iterators

Our front-end implementation has minor overlap with for loops, and their changes to include check_range_error and check_range_index also is quite compatible with our current implementation. As long as error report group have fixed conflicts with them, our implementaion will have no conflicts with them. Below is a typical example:

```python
i:int = 0
for i in range(1, 10, 0):
    print(i)
```

The output will be "ValueError: arg3 can't be 0 for range", so as long as we get the right error output from the interfaces desigend the error report group, we will display them in the UI without conflicts, other testcases with for loops will also be passed.

## 9. Generics and polymorphism

The team added the `genericArgs` in class' AST and type, and added the support for generics in `parser.ts`. One possible conflict is that the author defined remove-generics.ts to collect and recreate all the specializations for each generic type. This new module introduced the `removeGenerics` function to `repl.t`s to insert one more step before `tc` in `repl.tc`. However, we did not made any change in `repl.tc`, which is only used for `helpers.test.ts` for now. Therefore, generics would not cause conflicts.

## 10. I/O, files

Potential conflict may occur in extenstion part in `webpack.config.js`. We add `.js` to resolve
files with `.js` extenstion.

Since supporting more extension will not affect other feature implementation, we can resolve the
conflict by using our modification.

## 11. Inheritance

For the inheritance, they add vtable address for each object so the conflict might be when we are printing the fields of an object, we might want to skip the vtable address or add function name on the user interface.

## 12. Lists

In the list design, the length of list will be stored in the first location at the list address. Therefore, when we printed out the list, firstly we will read the length of the list and then determine the length we will read on the heap. But it raise another question, what if list can append element? I am not sure about list future design.  

## 13. Memory management

Memory management team changed the files a lot. We disscused with them and we came to an agreement that we don't need the specific address for each obejct to display the current heap, as all addresses in memory are scattered. Noted that they added `global_type` and `local_type` in `currentEnv` of `repl.ts` as they changed the layout of an allocation. However, a change in the header of an object in memory does not mean a change in its fields layout, that is, the method for our `objectTrack` function to obtain all fields of an object has not changed. Therefore, memory management is invisible to the front-end and there are no conflicts.

```python
class C(object):
    x:int = 0
c:C = None
c = C()
c.x = 5
```

In the example above, the field of `c` in memory is still `x=5`. There is no change between before adding and after adding the memory management feature.

## 14. Optimization

There is no obvious overlap between the optimization process and the front-end display. Noted that optimization requires additional data structures to be passed at compile process. Therefore, the newly added `astOpt` and `irOpt` parameters can be seen in `repl.ts`. In addition, to get the length of the optimized WASM code for testing, a new field `watCode` has been introduced and assigned in `repl.ts`. Since we did not modified that part of code in our existing implementation, there are no foreseeable conflicts.

## 15. Sets and/or tuples and/or dictionaries

It looks like the set feature has been implemented, and since there is no modification to the front-end scripts, we don't have any conflicts.

Since the values in set are scattered in memory and are stored in a linked list, we need to further disscus with the team the implementation details of set's add function to display the set value in heap.

## 16. Strings

The string team implment the print function on their own which might lead to some minor conflict. Because out front end move the print function into a new file. To solve that conflict, we can extract out a function abou how to construct a string from wasm int like big num team.

Our major conflicts might lie on the print function in webstart and make all new added object coordinate to each other.
