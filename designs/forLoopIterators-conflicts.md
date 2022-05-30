## Conflicts with other features of the compiler ##
 
* ### Bignums
There is no interaction between our implementation and Bignums. Since, we are first writing the inbuilt functions/classes in python and then converting those to wasm, we do not need to worry about whether a number is a bignum or not.
 
Input:
```python
class __range__(object):
    start: int = 0
    stop: int = 0
    step: int = 1
    hasNext: bool = False
    currval: int = 0
    def __init__(self: __range__):
        pass
    def new(self: __range__, start: int, stop: int, step: int) -> __range__:
        self.start = start
        self.stop = stop
        self.step = step
        self.currval = start
        return self
 
    def next(self: __range__) -> int:
        prev: int = 0
        prev = self.currval
        self.currval = prev+self.step
        return prev
       
    def hasnext(self: __range__) -> bool:
        nextval: int = 0
        nextval = self.currval
        if((self.step>0 and nextval<self.stop) or (self.step<0 and nextval>self.stop)):
            self.hasNext = True
        else:
            self.hasNext = False
        return self.hasNext
 
def range(start: int, stop: int, step: int) -> __range__:
    return __range__().new(start, stop, step)
 
i: int = 0
for i in range(0,100000000000000000000000000000000000000000,50000000000000000000000000000000000000000):
  print(i)
 
```
Output:
```
0
50000000000000000000000000000000000000000
```
 
All the mathematical operations in the python code in class __range__, will use the operations of Bignum!
 
For the later stages of the project, we are planning to convert python code to wasm in stdlib. Hence, we aren’t hard-coding any of the range functions anywhere (typescript or wasm) where we would need the following:
 
1. reconstructBigint(address, load)
2. deconstructBigint(number, alloc, store)
 
* ### Built-in libraries/Modules/FFI
 
We do not have any conflicts with the built-in group. The range parameters can be the value returned by a builtin function. Further, an iterable’s next() function can return the value returned by a builtin function. These will be parsed and lowered as usual without any changes from our side.
 
Input:
```
class __range__(object):
    start: int = 0
    stop: int = 0
    step: int = 1
    hasNext: bool = False
    currval: int = 0
    def __init__(self: __range__):
        pass
    def new(self: __range__, start: int, stop: int, step: int) -> __range__:
        self.start = start
        self.stop = stop
        self.step = step
        self.currval = start
        return self
 
    def next(self: __range__) -> int:
        prev: int = 0
        prev = self.currval
        self.currval = prev+self.step
        return prev
       
    def hasnext(self: __range__) -> bool:
        nextval: int = 0
        nextval = self.currval
        if((self.step>0 and nextval<self.stop) or (self.step<0 and nextval>self.stop)):
            self.hasNext = True
        else:
            self.hasNext = False
        return self.hasNext
 
def range(start: int, stop: int, step: int) -> __range__:
    return __range__().new(start, stop, step)
 
i: int = 0
for i in range(0,factorial(10),5):
  print(i)
```
 
* ### Closures/first class/anonymous functions
 
Our groups have minimal interaction.
 
```
def add(a: int) -> Callable[[int], int]:
    i: int = 0
    for i in range(0,5,1):
        def g():
            return i
        a = a + g()
    return a + g()
```
 
Since these closures are translated to class definitions and initializations, there will not be more interactions.
 
* ### comprehensions
 ```
  print([num for num in range(8) if num % 2 == 0])
 ```
 ***Expected Output**
 ```[0, 2, 4, 6]```
 
 We don't anticipate any overlap with the comprehension groups since they implement their own for loop with an if condition. (We renamed our function `isIterable` to `isIterableObject` to avoid the same function declaration).
 
 Regarding implementation of `range`, we should stick to one implementation of `range` class which will then be compiled to wasm. Since currently, they are simply appending the python implementation of range to every test, there won't be any conflicts.
 
 
* ### Destructuring assignment
 
```
a:[int] = None
b:[int] = None
c:[int] = None
a = [1,3, 1]
b = [3,1, 1]
c = [-4, -4, 1]
i:int = 0
j:int = 0
k:int = 0
for i, j, k in [a, b, c]:
	print(i + j + k)
for i, *j in [a, b, c]:
	print(j)
```
**Expected Output**
5
5
-7
[3, 1]
[1, 1]
[-4, 1]

 
We have substantial overlap with the changes made by destructuring group since it's essential to support destructuring while looping through any iterable object
 
#### Changes required
 
**AST changes**
```
{  a?: A, tag: "for", vars: Expr<A>, iterable: Expr<A>, body: Array<Stmt<A>>, elseBody?: Array<Stmt<A>> }
```
to
```
{  a?: A, tag: "for", vars:DestructureLHS<A>[] , iterable: Expr<A>, body: Array<Stmt<A>>, elseBody?: Array<Stmt<A>> }
```
 
**Parser changes**
We would need to import the code snippets from their implementation of the assign statement and adapt them for parsing the loop variables  expression (named as `target` in their code) and the iterable expression (which can be single expression or array of expressions ). Currently, they have implemented separate cases for cases such as assignment of single expression (e.g. c.x = 10 or i = 10), expression of variables (e.g. i, j = 10, 11 or i, *j, k = (1,2,4)).
 
**Type-check changes**
The  helper functions `tcDestructure` and `tcAssignTargets` implemented by the destructuring group would be directly employed in type-checking the loop variable expression, iterable expression and the destructuring assignments. Essentially, we would need to change
```
if(!equalType(tVars.a[0], tIterableRet))
	throw new TypeCheckError("Expected type `"+ tIterableRet.tag +"`, got type `" + tVars.a[0].tag + "`");
```
to use these helper functions.
 
**Lower changes**
The `assign` statement in lower.ts that assigns the loop variable expression to the return expression of the `next` function of iterable in the loop body would be changed to `assign-destr`.
 
This current code snippet from lower.ts would be changed to
```
pushStmtsToLastBlock(blocks, ...s_stmts, {a:[NONE, s.a[1]],  tag: "assign", name: s.vars, rhs: s_expr } );
```
 
```
pushStmtsToLastBlock(blocks, ...s_stmts, {a:[NONE, s.a[1]],  tag: "assign-destr", destr: s.vars, value: s_expr } );
```
 
* ### Error reporting
 
We are supporting the following errors w.r.t for loops:
 
Checking if an expr is an iterable by checking if it is an object and if the object the class belongs to has next and hasnext functions. 
Input:
```python
class range(object):
    num:int = 1
    def __init__(self: range):
        pass
    def hasnext(self: range) -> bool:
        if self.num > 16:
            return False
        else:
            return True
 
i: int = 0
for i in range():
    print(i)
```
Output:
```
TypeCheckError: Not an iterable
```
Checking if the value returned by the next() function of the iterable class is assignable to the loop variable,. We are returning a TypeCheckError in this case. The following highlights this:
Input:
```python
class __range__(object):
    start: int = 0
    stop: int = 0
    step: int = 1
    hasNext: bool = False
    currval: int = 0
    def __init__(self: __range__):
        pass
    def new(self: __range__, start: int, stop: int, step: int) -> __range__:
        self.start = start
        self.stop = stop
        self.step = step
        self.currval = start
        return self
 
    def next(self: __range__) -> int:
        prev: int = 0
        nextval: int = 0
        if(self.hasnext()):
            prev = self.currval
            nextval = prev+self.step
            self.currval = nextval
            return prev
       
    def hasnext(self: __range__) -> bool:
        nextval: int = 0
        nextval = self.currval
        if((self.step>0 and nextval<self.stop) or (self.step<0 and nextval>self.stop)):
            self.hasNext = True
        else:
            self.hasNext = False
        return self.hasNext
 
def range(start: int, stop: int, step: int) -> __range__:
    return __range__().new(start, stop, step)
 
i : bool = False
for i in range(10):
    print(i)
```
Output:
```
TypeCheckError: bool object cannot be interpreted as integer
```
Further, we cannot have a break or continue outside a loop. We are returning a TypeCheckError in this case. Example:
Input:
```python
i: int = 0
for i in range():
    print(i)
break
```
Output:
```
TypeCheckError: break cannot exist outside a loop
```
 
Additionally, in python a StopIteration error is raised if the in-built hasnext() function returns false. However, to implement range, we are first checking the hasnext() function in lower.ts. If it returns false, then we shall directly jump to the relevant block without raising an Error. We shall stick to jumping to the relevant block without raising an expression for all other iterables too.
 
We shall show that we do not need to raise the StopIteration exception via a custom iterator:
 
Input:
```python
class BoolIterable(object):
    val:bool = True
    num:int = 0
    def __init__(self: BoolIterable):
        pass
    def next(self: BoolIterable) -> bool:
        ret: bool = True
        ret = self.val
        self.num = self.num + 1
        self.val = not self.val
        return ret
    def hasnext(self: BoolIterable) -> bool:
        if self.num > 5:
            return False
        else:
            return True
 
i: bool = True
for i in BoolIterable():
    print(i)
```
 
Output:
```
True
False
True
False
True
False
```
 
* ### Fancy calling conventions
 
Right now, there is no interaction between our implementation and Fancy calling conventions since we have forced range to be called with three compulsory parameters.
 
Input:
```python
class __range__(object):
    start: int = 0
    stop: int = 0
    step: int = 1
    hasNext: bool = False
    currval: int = 0
    def __init__(self: __range__):
        pass
    def new(self: __range__, start: int, stop: int, step: int) -> __range__:
        self.start = start
        self.stop = stop
        self.step = step
        self.currval = start
        return self
 
    def next(self: __range__) -> int:
        prev: int = 0
        prev = self.currval
        self.currval = prev+self.step
        return prev
       
    def hasnext(self: __range__) -> bool:
        nextval: int = 0
        nextval = self.currval
        if((self.step>0 and nextval<self.stop) or (self.step<0 and nextval>self.stop)):
            self.hasNext = True
        else:
            self.hasNext = False
        return self.hasNext
 
def range(start: int, stop: int, step: int) -> __range__:
    return __range__().new(start, stop, step)
 
i: int = 0
for i in range(0,10,5):
  print(i)
 
```
Output:
```
0
5
```
 
To support calling range with one and two parameters, like below, we shall change the definition of range function to have optional arguments after the group’s pull request merge. 
 
The following minor change is required to make it work:
 
```python
def range(start: int = 0, stop: int, step: int = 1) -> __range__:
    return __range__().new(start, stop, step)
```
 
Note that this is a change in python code, no changes are required in any other files to get this working if the optional parameters are supported!
 
* ### Front-end user interface
 
There are no conflicts between our features and the front-end user interface. The interactions are limited to print statements of the following forms:
 
Assume the __range__ class and range() function to be appended before the input.
```python
class BoolIterable(object):
    val:bool = True
    num:int = 0
    def __init__(self: BoolIterable):
        pass
    def next(self: BoolIterable) -> bool:
        ret: bool = True
        ret = self.val
        self.num = self.num + 1
        self.val = not self.val
        return ret
    def hasnext(self: BoolIterable) -> bool:
        if self.num > 5:
            return False
        else:
            return True
print(BoolIterable())
print(range(0,10,5))
```
Here, the iterables will be print statements with the  argument to print as a function or object. This should be supported by the group without needed any changes from our side.
 
* ### Generics and polymorphism
```python
T: TypeVar = TypeVar('T')
class ListIterator(Generic[T]):
    list: [T] = None
    index:int = 0
    def new(self: ListIterator, initVal: [T]) -> ListIterator:
        self.list = initVal
        return self
    def next(self: ListIterator) -> T:
        ret: T = None
        ret = self.list[self.index]
        self.index = self.index + 1
        return ret
    def hasnext(self: ListIterator) -> bool:
        return self.index<len(self.list)

def iter_list(lst: T) -> __ListIterator__:
	return __ListIterator__.new(lst)
```
We don't anticipate any conflict or overlap with the Generics/polymorphism group. Generics will work with for loops without any modifications.
 
**Changes Required**
While we don't need to make any changes in parser/type-checker/lower, we do require the Generics implementation to allow us to implement iterators in python for inbuilt types such as list/sets/dicts/tuples containing any arbitrary objects. For example a list could be a list of strings, class objects or even lists. This would work similarly for other types as well.
 
 
* ### I/O, files
 
In python, an opened file should also act as an iterable, for example:
 
```python
f : File = None
f = open('file.txt', 'r')
line : string = None
for line in f:
    print(line)
```
 
We shall make this work by implementing the `next()` and `hasnext()` for the class File defined in io.ts. The next() function should perform read and advance the read/write head in a file until there are no lines left (hasnext() returns false).
 
* ### Inheritance
```python
class A(object):
  a : int = 2
class B(A):
  b : bool = False
 
x : B = None
x = B()
i:int  = 0
for i in range(x.a):
	print(i)
```  
**Expected Output**
```
[0, 1]
```
```python
class A(object):
	x:int = 0
	def next(self: A) -> int:
    	ret:int = 0
    	ret = self.x
    	self.x = self.x + 1
    	return ret
   	 
class customerIterator(object):
	x:int = 5
	def hasnext(self: customerIterator) -> bool:
    	ret:bool = True
    	if self.x > 4:
        	return False
    	else:
        	return True
i:int = 0
for i in customerIterator():
	print(i)
```
**Expected Output**
```
[0, 1, 2, 3, 4]
```
 
We don't expect any interaction with the inheritance group implementation. Our for loop implementation works independently of any changes by the inheritance group. One interesting case we can think of is building iterators through inheritance, and we expect this to work without any changes.
 
* ### Lists
```python
a: [int] = None
a = [1,2,3]
i:int = 0
for i in a:
	print(i)
```
**Expected Output**
1
2
3
 
List is an inbuilt python iterable. The above is an example function where we are iterating over lists and that's not currently supported by our implementation.
 
We will add a Python implementation of a list class which implements `next` and `hasnext` for a list of integers. To support list of any arbitrary objects, we would use define a Generic type `T` which will be initialized with given type of list elements,
 
**AST changes**
We don't need any changes in AST since the lists group are defining a `listliteral` as a new  expression type.
**Parser changes**
We don't need any changes in Parser as well since the list groups will be handling the parsing of an ArrayExpression.  
**Type-check changes**
We are relying on the destructuring group to add `listliteral` as a supported type while type-checking any destructuring assignment since we use these functions to typecheck the loop variable expression and iterator expression.
 
**Lower changes**
No changes in `lower.ts` are required as the destructuring group will destructure the individual elements of list (`iterable`) and assign  them to loop variables, or assign lists when we have starred expressions.
 
* ### Memory management
 
We don’t have any interaction with the memory management group. Memory Management team implemented a builtin function test_refcount, and there is no iterators/for-loops in that part, there is no intersection between the 2 features. We are also not concerned with how they group store elements in the memory.
 
* ### Optimization
```python
start:int = 1
stop:int = 5
step:int = 1
i:int  = 0
for i in range(start, stop, step):
	print(i)
```
After optimization, this will convert to
```
i:int  = 0
for i in range(1, 5, 1):
	print(i)
```
 
The current implementation of the optimization group doesn't take into consideration for loops, so we don't expect any conflicts or any interactions. 
 
**Changes Required**
 
The optimization group would need new cases for the `for` statement in the `optimize_ast.ts`. This will enable support for various optimizations that they are implementing - such as Dead Code Elimination, CFA etc. 
 
 
* ### Sets and/or tuples and/or dictionaries
```python
a : set[int] = None
i:int  = 0
a = {1,2}
a.add(3)
for i in a:
	print(i)
```
**Expected Output**
1
2
3
 
Set is an inbuilt python iterable. The above is an example function where we are iterating over sets and that's not currently supported by our implementation.
 
 
We will add a Python implementation of a `set` class which implements `next` and `hasnext` for a sets of integers for now. To support sets of any arbitrary objects, we would use define a Generic type `T` which will be initialized with given type of set elements,
 
**AST changes**
We don't need any changes in AST since the sets group are defining a `bracket` as a new  expression type.
**Parser changes**
We don't need any changes in Parser as well since the set groups will be handling the parsing of a SetExpression.  
**Type-check changes**
We are relying on the destructuring group to add `set` as a supported type while type-checking any destructuring assignment since we use these functions to typecheck the loop variable expression and iterator expression.
 
**Lower changes**
No changes in lower are required as the destructuring group will destructure the individual elements of set (`iterable`) and assign them to loop variables, or assign sets when we have starred expressions.
 
 
* ### Strings
```python
s1:str = "abcd"
i:str = 'z'
for i in s1:
	print(i)
```
**Expected Output**
a
b
c
d
 
String is an inbuilt python iterable. The above is an example function where we are iterating over characters of a string and that's not currently supported by our implementation.
 
 
We will add a Python implementation of a `string` class which implements `next` and `hasnext` for a string. The `next` function will simply return the current character at some index and then update the index. The 'hasnext' function will  check whether the `len` of the string is less than the current index.
 
**AST changes**
We don't need any changes in AST.
**Parser changes**
We don't need any changes in Parser as well since the string groups will be handling the parsing of a String.  
**Type-check changes**
We are relying on the destructuring group to add `string` as a supported type while type-checking any destructuring assignment since we use these functions to typecheck the loop variable expression and iterator expression.
 
**Lower changes**
No changes in lower are required as the destructuring group will destructure the individual elements of string (`iterable`) which are strings themselves and  assign them to the loop variables.

