# For Loops and Iterators #
We implement for loops and iterators in the ChocoPy compiler B. We currently support the for loop functionality with break/continue,  inbuilt `range` iterator and ability to write custom iterators with a `next` and a `hasnext` function. In week 8, we plan to extend the iterator support to these five inbuilts types (lists, sets, tuples, dicts, strings). 

## AST changes ##
 
* The following changes will be required in `ast.ts` to `type Stmt<A>` : 
```        
{ a? :  Type, tag :  "for", vars :  Expr\<A\>, iterable :  Expr\<A\>, body :  Array\<Stmt\<A\>\>, elseBody? :  Stmt\<A\>}
{  a? :  A, tag :  "break", loopCounter? :  number }
{  a? :  A, tag :  "continue", loopCounter? :  number }
 ```    
`vars` can be a variable or a tuple expression. Once we merge the changes from the destructuring group, we will support tuple assignment for the loop variables.
`iterable` can be any inbuilt/user-defined class object with a `next` and a `hasnext` function.
`loopCounter` is an optional argument in the AST because we populate this values in the type-checker.  It stores unique loop index for each for and while loop.

## Parser changes ##
We add functionalities for `for`, `break` and `continue` statements.

## range class ##
For the first milestone, we implement an inbuilt `range(0, 5, 1)` as a function which returns a `__range__` class object. **Currently, all three parameters need to be compulsorily added for range() to work.** This object is an iterable with an inbuilt `new`, `next` and `hasnext` function.  The range class is written in Python and will be compiled in `runner.ts` to produce a `.wasm` file.
```
def range(start :  int, stop :  int, step :  int) -> __range__ : 
    return __range__().new(start, stop, step)
```
Note that users can create a custom `range` iterator as well.

## Type-check changes ##
We will add a "built-in" class in the global typechecking environment (`defaultGlobalClasses`) called `__range__` with the following specifications : 

**Fields** :  
```
start :  int
stop :  int
step :  int
hasnext :  bool
currvalue :  int
```
**Methods** :  
```
__init__(self, param1, param2, param3)
new(self, param) -> int
__hasnext__(self) -> bool
__next__(self) -> int
```
There is also the aforementioned `range` function added in `defaultGlobalFunctions`. Our current implementation doesn't require adding this inbuilt class and function to the  global type-checking environment. But it will be required once we generate a `range.wasm` file from the  Python implementation.

We add `loopCount` and  `currLoop` to the `LocalTypeEnv`. The first is an number while stores the global counter for any loop while `currLoop` behaves a stack and populates `loopCounter` for break and continue statements. 
```
locals.loopCount = locals.loopCount+1;
locals.currLoop.push(locals.loopCount);
var tForBody = tcBlock(env, locals, stmt.body);
locals.currLoop.pop();
```
`lower.ts` generate loop labels by appending a global counter to the end of a generated loop block name (such as whilestart and whilebody). This maintains consistency in break and continue when we utilize the `loopCounter` from the type-checker to identify the correct loop labels to jump to.

### Definition of an iterable ###
Any class object with a `next` and `hasnext` function is deemed to be an iterable. 

We check whether the iterable expr satisfied our definition of. As we don't currently support destructuring assignment, we assume the loop variable to be a single variable whose type must match the `next` function return type of the iterable. We can easily extend it once we merge the changes from the destructuring group. 

`break` and `continue` statements are also type-checked to ensure that they are defined within a loop. 

## Lower changes ##
We implement a generalizable for loop which can take any iterable and uses the `next` and `hasnext` function to go over the each element. We generate a new `rangeObject` which initializes the iterable class object. We call the `hasnext` function in `forstart` body, assign the loop variables to `next` function in start of `forbody`. There is an additional block of `forelse` which we jump to when there are no breaks encountered in the body statements.  

We  use `loopDepth` to label `break` and `continue` statements with a unique loop index. Accordingly, we jump to `forend` and `forstart` blocks of the specific loop index for break and contine respectively. 

## IR changes ##
We don't need any changes in ir.ts, since for, break and continue are control flow statements, and ifjmp and jmp in ir.ts cover the behavior that we need to implement these.

## Code Gen changes ##
No changes in the code generation are required for our interface,

### New file range.test.ts
This contains all the tests shown above.

We plan to implement these helper function for the five inbuilt type (lists, sets, tuples, dicts, strings) in Week 9. 

## Test Cases ##

We shall join the following code at the start of each input : 

```Python
class __range__(object) : 
    start :  int = 0
    stop :  int = 0
    step :  int = 1
    hasNext :  bool = False
    currval :  int = 0
    def __init__(self :  __range__) : 
        pass
    def new(self :  __range__, start :  int, stop :  int, step :  int) -> __range__ : 
        self.start = start
        self.stop = stop
        self.step = step
        self.currval = start
        return self

    def next(self :  __range__) -> int : 
        prev :  int = 0
        nextval :  int = 0
        if(self.hasnext()) : 
            prev = self.currval
            nextval = prev+self.step
            self.currval = nextval
            return prev
        
    def hasnext(self :  __range__) -> bool : 
        nextval :  int = 0
        nextval = self.currval
        if((self.step>0 and nextval<self.stop) or (self.step<0 and nextval>self.stop)) : 
            self.hasNext = True
        else : 
            self.hasNext = False
        return self.hasNext

def range(start :  int, stop :  int, step :  int) -> __range__ : 
    return __range__().new(start, stop, step)
```

* **Test Case 1** :  for loop with range
 
Input : 
```Python
i :  int = 0
for i in range(0,10,2) : 
    print(i)
```
Output : 
```
0
2
4
6
8
```
* **Test Case 2** :  for loop with range :  called inside a fucntion with function parameters
 
Input : 
```Python
def f(x :  int, y :  int) : 
    i :  int = 0
    for i in range(x*1,y*1,1*2*abs(1)) : 
        print(i)
f(0,10)
```
Output : 
```
0
2
4
6
8
```
 
* **Test Case 3** :  for loop with range :  negative step
Input : 
```Python
i :  int = 0
for i in range(0,-10,-2) : 
    print(i)
```
Output : 
```
0
-2
-4
-6
-8
```

* **Test Case 4** :  for loop with break in the main for loop body
 
Input : 
```Python
i : int = 0
for i in range(10) : 
    print(i)
    break
```
Output : 
```
0
```
* **Test Case 5** :   for loop with break inside a if body
 
Input : 
```Python
i : int = 0
for i in range(10) : 
    If i\>5 : 
        break
    else :  
        print(i)
```
Output : 
```
0
1
2
3
4
5
```
 
* **Test Case 6** :   for loop with continue inside the main for body
 
Input : 
```Python
i : int = 0
for i in range(5) : 
    print(i*100)
    continue
    print(i)
```
Output : 
```
0
100
200
300
400
```
 
* **Test Case 7** :   for loop with continue inside a if body
 
Input : 
```Python
i : int = 0
for i in range(10) : 
    if i%2==0 : 
        continue
    else : 
        print(i)
```
Output : 
```
1
3
5
7
9
```

* **Test Case 8** :   range :  nested for loop with break
 
Input : 
```Python
i :  int = 0
j : int = 0
for i in range(0,5,1) : 
    print(i)
    for j in range(0,2,1) : 
        print(j) 
    break   
```
Output : 
```
0
0
1
```

* **Test Case 9** :  range :  complex break, continue 1
 
Input : 
```Python
i :  int = 0
j : int = 0
for i in range(0,5,1) : 
    j = 0
    print(i)
    while(j<i) : 
        print(j) 
        j=j+1
        if j%2==0 : 
            continue
    break   
```
Output : 
```
0
```

* **Test Case 10** :   range :  complex break, continue 2
 
Input : 
```Python
i :  int = 0
j : int = 0
for i in range(0,5,1) : 
    j = 0
    print(i)
    while(j<i) : 
        print(j) 
        j=j+1
        if i%2==0 : 
            continue
    if i%2==1 : 
        continue  
```
Output : 
```
0
1
0
2
0
1
3
0
1
2
4
0
1
2
3
```

* **Test Case 11** :    range :  complex break, continue 3
 
Input : 
```Python
i :  int = 0
j : int = 0
k :  int =0
for i in range(0,5,1) : 
    j = 0
    print(i)
    while(j<i) : 
        print(j) 
        j=j+1
        if i%2==0 : 
            continue
        else : 
        	pass
        for k in range(100,0,-10) : 
            if k%30==0 : 
                print(k)
                continue
            else : 
            	pass
    if i%2==1 : 
        continue 
```
Output : 
```
0
1
0
90
60
30
2
0
1
3
0
90
60
30
1
90
60
30
2
90
60
30
4
0
1
2
3
```

* **Test Case 12** :    range :  complex break, continue 4
 
Input : 
```Python
i :  int = 0
j : int = 0
k :  int =0
for i in range(0,5,1) : 
    j = 0
    print(i)
    while(j<i) : 
        print(j) 
        j=j+1
        if i%2==0 : 
            continue
        else : 
        	pass
        for k in range(100,0,-10) : 
            if k%30==0 : 
                print(k)
                break
            else : 
            	pass
    if i%2==1 : 
        continue  
```
Output : 
```
0
1
0
90
2
0
1
3
0
90
1
90
2
90
4
0
1
2
3
```

* **Test Case 13** :    range :  complex break, continue 5
 
Input : 
```Python
i :  int = 0
j : int  = 0
k :  int = 0 
for i in range(10, -10, -1) : 
    for j in range(1, 5, 1) : 
        for k in range(1, 5, 2) : 
            if(i + j + k == 0) : 
                print(i)
                print(j)
                print(k)
                break
            else : 
                continue
        if(i + j + k == 0) : 
            break
        else : 
            continue
    if(i + j + k == 0) : 
        break
    else : 
        continue
```
Output : 
```
-2
1
1
```
 
* **Test Case 14** :  for else construct 1
 
Input : 
```Python
i : int = 0
for i in range(10, 0, -1) : 
    if i < 5 : 
        break
    else : 
        print(i)
else : 
    print(123456)
```
Output : 
```
10
9
8
7
6
5
```

* **Test Case 15** :  for else construct 2
 
Input : 
```Python
i : int = 0
for i in range(10, 5, -1) : 
    if i < 5 : 
        break
    else : 
        print(i)
else : 
    print(123456)
```
Output : 
```
10
9
8
7
6
123456
```
* **Test Case 16** :  Custom Iterator 1
 
Input : 
```Python
class EvenNumbers(object) : 
    num : int = 0
    def __init__(self :  EvenNumbers) : 
        pass
    def next(self :  EvenNumbers) -> int : 
        ret :  int  = 0 
        ret = self.num
        self.num = self.num + 2
        return ret
    def hasnext(self :  EvenNumbers) -> bool : 
        if self.num > 10 : 
            return False
        else : 
            return True

i :  int = 0
for i in EvenNumbers() : 
    print(i)
```
Output : 
```
0
2
4
6
8
10
```
* **Test Case 17** :   Custom Iterator called range
 
Input : 
```Python
class range(object) : 
  num : int = 1
  def __init__(self :  range) : 
      pass
  def next(self :  range) -> int : 
      ret :  int  = 0 
      ret = self.num
      self.num = self.num * 2
      return ret
  def hasnext(self :  range) -> bool : 
      if self.num > 16 : 
          return False
      else : 
          return True

i :  int = 0
for i in range() : 
  print(i)

```
Output : 
```
1
2
4
8
16
```
* **Test Case 18** :  Custom bool iterator
 
Input : 
```Python
class BoolIterable(object) : 
    val : bool = True
    num : int = 0
    def __init__(self :  BoolIterable) : 
        pass
    def next(self :  BoolIterable) -> bool : 
        ret :  bool = True
        ret = self.val
        self.num = self.num + 1
        self.val = not self.val
        return ret
    def hasnext(self :  BoolIterable) -> bool : 
        if self.num > 5 : 
            return False
        else : 
            return True

i :  bool = True
for i in BoolIterable() : 
    print(i)
```
Output : 
```
True
False
True
False
True
False
```

* **Test Case 19** :  type checking for loop variable 1
 
Input : 
```Python
i : bool = False
for i in range(10) : 
    print(i)
```
Output : 
```
TypeCheckError :  bool object cannot be interpreted as integer
```

* **Test Case 20** :  type checking for loop variable 2
 
Input : 
```Python
for i in range(10) : 
    print(i)
```
Output : 
```
TypeCheckError :  Unbound id :  i
```

* **Test Case 21** :  range :  type checking for one parameter
 
Input : 
```Python
i :  int = 0
for i in range(5) : 
    print(i)
```
Output : 
```
TypeError :  range expected 3 arguments, got 1
```

* **Test Case 22** :  range :  type checking for two parameters
 
Input : 
```Python
i :  int = 0
for i in range(5,10) : 
    print(i)
```
Output : 
```
TypeError :  range expected 3 arguments, got 2
```

* **Test Case 23** :  range :  type checking for range parameters
 
Input : 
```Python
i : int = 0
for i in range(10, 20, 1, 1) : 
    print(i)
```
Output : 
```
TypeError :  range expected 3 arguments, got 4
```

* **Test Case 24** :  Type Checking :  not an iterator 1
 
Input : 
```Python
class range(object) : 
    num : int = 1
    def __init__(self :  range) : 
        pass
    def hasnext(self :  range) -> bool : 
        if self.num > 16 : 
            return False
        else : 
            return True

i :  int = 0
for i in range() : 
    print(i)
```
Output : 
```
TypeCheckError :  Not an iterable
```

* **Test Case 25** :  Type Checking :  not an iterator 2
 
Input : 
```Python
class range(object) : 
    num : int = 1
    def __init__(self :  range) : 
        pass
    def next(self :  range) -> int : 
        ret :  int  = 0 
        ret = self.num
        self.num = self.num * 2
        return ret
i :  int = 0
for i in range() : 
    print(i)  
```
Output : 
```
TypeCheckError :  Not an iterable
```

* **Test Case 26** :  Type Checking :  break outside loop
 
Input : 
```Python
i :  int = 0
for i in range() : 
    print(i) 
break 
```
Output : 
```
TypeCheckError :  break cannot exist outside a loop
```

* **Test Case 27** :  Type Checking :  continue outside loop
 
Input : 
```Python
i :  int = 0
for i in range() : 
    print(i) 
continue 
```
Output : 
```
TypeCheckError :  continue cannot exist outside a loop
```
## New Test Cases for Week 9

### Test cases that will work after current week's merge ###
**Test Case 1 : List of int's as an Iterator**
```Python
a : [int] = None
i : int = 0
a = [1,2,3]
for i in a : 
    print(i)
```

**Expected Output**
```
1
2
3
```
**Test Case 2 List of bool's as an Iterator :**
```Python
a : [bool] = None
i : bool = False
a = [True,False,True]
for i in a : 
    print(i)
```
**Expected Output**
```
True
False
True
```

**Test Case 3 : String as an iterator**
```Python
a : str = "cse231"
i : str = 0
for i in a : 
    print(i)
```

**Expected Output**
```
c
s
e
2
3
1
```

**Test Case 4 :Set of int's as an Iterator**
```Python
set_1 : set[int] = None
set_1 = {11,22}
set_1.add(33)
for i in set1 : 
    print(i)
```
**Expected Output**
```
11
22
33
```

**Test Case 5 :Iterable Object - `iter` and `next` in list of int's**
```Python
a : [int] = None
i : int = 0
a = [1,2,3]
list_itr : ListIteratorInt = None
list_itr = iter(a)
print(next(list_itr))
print(next(list_itr))
print(next(list_itr))
```
**Expected Output**
```
1
2
3
```
**Test Case 6: Iterable Object - `iter` and `next` in list of bool's**
```Python
a : [bool] = None
i : int = 0
a = [True, False, True, False, True, False]
list_itr : ListIteratorBool = None
list_itr = iter(a)
print(next(list_itr))
print(next(list_itr))
print(next(list_itr))
```
**Expected Output**
```
True
False
True
```

**Test Case 7 :Iterable Object - `iter` and `next` in a string**
```Python
a : str = "cse231"
str_itr : StringIterator = iter(a)
print(next(str_itr))
print(next(str_itr))
print(next(str_itr))
```

**Expected Output**
```
c
s
e
```

**Test Case 8 :Iterable Object - `iter` and `next` in a set of int's**
```Python
a : set{int} = None
i : int = 0
a = {1, 2, 3, 4}
set_itr : SetIteratorInt = None
set_itr = iter(a)
print(next(set_itr))
print(next(set_itr))
```
**Expected Output**
```
1
2
```

**Test Case 9 : StopException error when iterator object is empty**
```Python
a : [int] = None
i : int = 0
a = [1]
list_itr : ListIteratorInt = None
list_itr = iter(a)
print(next(list_itr))
print(next(list_itr))
```
**Expected Output**
```
1
RUNTIME ERROR :  StopIteration
```


**Test Case 10 :Iterable Object - only `next` in a custom iterator 1**
```Python
class EvenNumbers(object) : 
    num : int = 0
    def __init__(self :  EvenNumbers) : 
        pass
    def next(self :  EvenNumbers) -> int : 
        ret :  int  = 0 
        ret = self.num
        self.num = self.num + 2
        return ret
    def hasnext(self :  EvenNumbers) -> bool : 
        if self.num > 10 : 
            return False
        else : 
            return True
custom_iter :  EvenNumbers = EvenNumbers()
print(next(custom_iter))
print(next(custom_iter))
print(next(custom_iter))
```
**Expected Output**
```
0
2
4
```

**Test Case 11 :Iterable Object - `iter` and `next` in a custom iterator 2**
```Python
class EvenNumbers(object) : 
    num : int = 0
    def __init__(self :  EvenNumbers) : 
        pass
    def next(self :  EvenNumbers) -> int : 
        ret :  int  = 0 
        ret = self.num
        self.num = self.num + 2
        return ret
    def hasnext(self :  EvenNumbers) -> bool : 
        if self.num > 10 : 
            return False
        else : 
            return True
custom_iter :  EvenNumbers = iter(EvenNumbers())
print(next(custom_iter))
print(next(custom_iter))
print(next(custom_iter))
```
**Expected Output**
```
0
2
4
```

**Test Case 12 :** destructuring assignment type error 1, single loop variable
```Python
a : [int] = None
i : bool = 0
a = [1,2,3]
for i in a : 
    print(i)
```
**Expected Output**
```
This will throw a TypeError :  Expected int; got bool
```
**Test Case 13 :** destructuring assignment type error 2, multiple loop variable
```Python
i : int = 0
j : bool = 0
for i, j in [[1, 2], [2, 4]] : 
    print(i)
    print(j)
```
**Expected Output**
```
This will throw a TypeError :  Expected int; got bool
```

**Test Case 14 :** iter needs iterable as argument 1, no next() function
```Python
class range(object) : 
    num : int = 1
    def __init__(self :  range) : 
        pass
    def hasnext(self :  range) -> bool : 
        if self.num > 16 : 
            return False
        else : 
            return True
iter(range())
```
**Expected Output**
```
This will throw a TypeError :  Not an iterable
```

**Test Case 15 :** iter needs iterable as argument 2, not an object
```Python
i : int = 0
iter(i)
```
**Expected Output**
```
This will throw a TypeError :  Not an iterable
```

**Test Case 16 :** next needs iterable as argument 1, not an object
```Python
i : int = 0
next(i)
```
**Expected Output**
```
This will throw a TypeError :  Not an iterable
```

**Test Case 17 :** next needs iterable as argument 2, list is not an iterable
```Python
listNum : [int] = [0, 1, 2]
next(listNum)
```
**Expected Output**
```
This will throw a TypeError :  Not an iterable
```

**Test Case 18 :** next needs iterable as argument 3, str is not an iterable
```Python
s : str = "cse231"
next(s)
```
**Expected Output**
```
This will throw a TypeError :  Not an iterable
```

**Test Case 19 :** next needs iterable as argument 4, set is not an iterable
```Python
s : set[int] = {1 ,2, 3}
next(s)
```
**Expected Output**
```
This will throw a TypeError :  Not an iterable
```

### Test cases that will work after the final merge ###
**Test Case 20 :** iterables with lists of lists of ints (**after the Generics group support ListWrappers and T as type List**)
```Python
a : [int] = None
b : [int] = None
c : [int] = None
a = [1,3]
b = [3,1]
c = [-4, -4]
i : int = 0
j : int = 0
k : int = 0
for i, j in [a, b, c] : 
    print(i + j)
```
**Expected Output**
```
4
4
-8
```

**Test Case 21 :** iterables with lists of lists of strings (**after the Generics group support ListWrappers and T as type List**)
```Python
a : str = "abc"
b : str = "bcd"
i : str = ""
j : str = ""
for i, j in [[a, b], [b, a]] : 
    print(i)
    print(j)
```
**Expected Output**
```
abc
bcd
bcd
abc
```

# Week 8 and 9 features Roadmap #
 
We shall be implementing the following for the next week : 
 
* Iterables for currently supported builtin types - **lists, sets, strings**.
* the iter() function, which takes as input one of the builtin types :  lists, sets, strings. The function returns an iterable object
* the next() function, which takes as input an iterable object. Iterable objects are the built-in types (lists, sets, strings) on which iter() has been called or an object of a class that has next() and hasnext() functions
 
**Changes Required**
 
Supporting iterables for builtin types would entail implementing a custom iterator class for each of these inbuilt-types. Below is an example of how  we will implement a list iterator class using Generics.
 
```python
T :  TypeVar = TypeVar('T')
class ListIterator(Generic[T]) : 
    list :  [T] = None
    index : int = 0
    def new(self :  ListIterator, initVal :  [T]) -> ListIterator : 
        self.list = initVal
        return self
    def next(self :  ListIterator) -> T : 
        ret :  T = None
        ret = self.list[self.index]
        self.index = self.index + 1
        return ret
    def hasnext(self :  ListIterator) -> bool : 
        return self.index<len(self.list)
```
 
We are contingent on the Generics groups for implementing the list wrapper class, to support the type lists of this format [T]. Further, even after this implementation succeeds we shall only be able to support iterables of lists of generic types supported by the generics group. For example :  if T can only be string, bool or int, then we’ll support list iterables for cases when list elements are inbuilt-types such as strings, int or  bool.
 
Currently, we will implement two list iterable classes as follows to make lists of primitive types work.
 
```python
class ListIteratorInt() : 
   list :  [int] = None
   index : int = 0
   def new(self :  ListIteratorInt, initVal :  [int]) -> ListIteratorInt : 
   	self.list = initVal
   	return self
   def next(self :  ListIteratorInt) -> int : 
   	ret :  int = None
   	ret = self.list[self.index]
   	self.index = self.index + 1
   	return ret
   def hasnext(self :  ListIteratorInt) -> bool : 
    return self.index<len(self.list)
```
 
```python
class ListIteratorBool() : 
   list :  [bool] = None
   index : int = 0
   def new(self :  ListIteratorInt, initVal :  [bool]) -> ListIteratorBool : 
   	self.list = initVal
   	return self
   def next(self :  ListIteratorBool) -> bool : 
   	ret :  bool = None
   	ret = self.list[self.index]
   	self.index = self.index + 1
   	return ret
   def hasnext(self :  ListIteratorBool) -> bool : 
    return self.index<len(self.list)
```
 
Similarly, we will support SetIterableInt, SetIterableBool, StringIterable.
 
* Changes required for iter() to work : 
We will be required to construct the corresponding iterable object for every call of the iter function. `type-check.ts` would contain the requisite cases (whether it’s a list, set, string or custom iterator) for calling the concerned iterable class.
 
The following are the changes required in `type-check.ts` to make this work, in the case “call” : 
 
```typescript
default : {
    if(expr.name === “iter”) {
	  // Typecheck argument to be of builtin types or object of a class that has next() and hasnext()
        // check the type of the argument
        // if argument is list of ints/bools create and return a ListIterableInt/ListIterableBool object
        // if argument is sets of ints/bools create and return a SetIterableInt/SetIterableBool object
         // if argument is a string create and return a StringIterable object
        // if argument is an object of a class that has next() and hasnext() return the same object
	}   
}
```
* Changes required to make next() work : 
The function next() will take as input an iterable (ListIterableInt, ListIterableBool, SetIterableInt, SetIterableBool, StringIterable or a custom object). Then, `type-check.ts` would contain the requisite cases for calling the concerned iterable class’s next() function.
 
The following are the changes required in `type-check.ts` to make this work, in the case “call” : 
 
```typescript
default : {
    if(expr.name === “next”) {
        // Typecheck argument to be of type ListIterableInt, ListIterableBool, SetIterableInt, SetIterableBool, StringIterable or object of a class that has next() and hasnext()
        // add the following expr/stmt equivalent to python(call expr.arg.next())
	}   
}
```




