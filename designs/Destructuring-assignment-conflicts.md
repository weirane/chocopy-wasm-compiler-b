# Compiler B Destructuring Assignment conflicts with other features: 

## Bignums

```
x : int = 12345678900987654321
y : int = 11223344556677889900
a : int = 0
b : int = 0
a,b = x - y , x + y
print(a)
print(b)
```

**Expected Output**

1122334344309764421

23569023457665544221


**Changes Required** 

* If the basic implementation works from both the teams, we would not need any additional changes to support this case and the integration should be smooth. 
* Since the Bignums team has added BigInts to _Literal_ in the AST, which in turn is part of Expr, both teams do not need additional changes to support BigNums in Destructuring. 



## Built-in libraries/Modules/FFI

```
x : int = 3
y : int = 2
a : int = 0
b : int  = 0
a,b = max(factorial(c), factorial(d)),pow(x,y)
print(a)
print(b)
```
**Expected Output**

6

8

**Changes Required** 
* The builtins team has added all supported built-in functions as part of the _builtinlib.ts_ file. 
* These functions will be parsed as _CallExpressions_ in the parser and the functionality will be supported by the BuiltIns team. 
* Destructuring RHS is expected to be an _Expr_ which includes _CallExpression_ and hence the integration should pass without any conflicts.


## Closures/first class/anonymous functions

```
def f1(x:int) -> Callable[[int], int]:
  def f2(y:int) -> int:
    return x+y 
  return f2
func1: Callable[[int], int] = None
func2: Callable[[int], int] = None
func1, func2 = f1(1), f1(2)
```

**Expected Output**

func1 and func2 are function pointers to f1 with specific arguments passed into them.

**Changes Required** 
* We do not anticipate any conflicts with Closures/First Class/Anonymous Functions. 
* The Closures team has implemented the Closures using a custom `func` type in the AST. 
* This can be supported out-of-the box with Destructuring Assignment as they are expected to be first-class citizens in the compiler. 

## Comprehensions
```

a:[int] = None
b:[int] = None
i:int = 0
j:int = 0
a = [2,3]
b = [3,4]
print([i + j for i , j in [a, b]])
```

**Expected Output**

5

7

**Changes Required**

* For List comprehensions, we need to support destructuring while assigning LHS in list comprehensions. 
* We need to unpack the iterable for assigning it to the LHS after destructuring it. 
* To support this change, we need to make a change in all 4 files as mentioned below:
  * **AST** : There will be a change in current list comprehension AST to support destructuring on LHS.

    **Current AST:**
  `{  a?: A, tag: "comprehension", type: Type, lhs: Expr<A>, item: string, iterable: Expr<A>, ifcond?: Expr<A> }`
  
    **New AST:**
  `{  a?: A, tag: "comprehension", type: Type, lhs: DestructureLHS<A>[], item: string, iterable: Expr<A>, ifcond?: Expr<A> }`
   
   So, we need to change the lhs as "DestructureLHS<A>[]" which is a type that currently supports normal destructuring assignments LHS.
   Iterables will be similarly handled with an Expr<A> as in destructuring RHS.
 
  * **Parser** : While traversing LHS, we need to loop from “for” until we hit operator “in” and store it as an array of type “DestructureLHS<A>[]” according to the updated AST. 
  
  * **Type-Check** : We need to loop and typecheck all LHS expressions with the iterables return types. 
  * **Lower** : We need to loop and assign each LHS assignment with the respective iterable.

## Error reporting

```
a:int = 0
b:int = 0
a, b = 5, False
```

**Expected Output**

TYPE ERROR : Type Mismatch while destructuring assignment


In the above example, we are utilizing the TypeCheckError method introduced by the Error Reporting team.

`throw new TypeCheckError("Type Mismatch while destructuring assignment")`

**Changes Required**

* Our current milestone code includes the error reporting merges (including custom error types and SourceLocation which has been added to every return in parser)
* If the basic implementation works from both the teams, we would not need any additional changes to support this case and the integration should be smooth. 

## Fancy calling conventions

```
def test(a : int = 1+2, b : int):
   x : int = 0
   y : int = 0
   z : int = 0
   x, y, z = a + 20 , b, -20
   print(x)
   print(y)
   print(z)

test(5)
```

**Expected Output**

23

5

-20


**Changes Required**
* Destructuring Assignment does not have any major points of overlap with Fancy Calling Conventions. 
* Fancy calling conventions concentrate on arguments in function signatures and destructuring does not come into the picture. 
* If the arguments in the calling conventions are parsed correctly, destructuring would be supported implicitly.

  
## For loops/iterators

```
a:[int] = None
b:[int] = None
i:int = 0
j:int = 0
a = [2,3]
b = [3,4]
for i , j in [a, b] :
    print(i+j)
```
  
**Expected Output**

5
  
7
  
**Changes Required**
* We need to support destructuring while assigning LHS in for loops.
* We need to unpack the iterable for assigning it to the LHS after destructuring it. 
* To support this change, we need to make a change in all 4 files as mentioned below:
  * **AST** : There will be a change in current list comprehension AST to support destructuring on LHS.

    **Current AST:**
  `{  a?: A, tag: "for", vars: Expr<A>, iterable: Expr<A>, body: Array<Stmt<A>>, elseBody?: Array<Stmt<A>> }`
  
    **New AST:**
  `{  a?: A, tag: "for", vars: DestructureLHS<A>[], iterable: Expr<A>, body: Array<Stmt<A>>, elseBody?: Array<Stmt<A>> }`
   
   So, we need to change the lhs as "DestructureLHS<A>[]" which is a type that currently supports normal destructuring assignments LHS.
   Iterables will be similarly handled with an Expr<A> as in destructuring RHS.
 
  * **Parser** : While traversing LHS, we need to loop from “for” until we hit operator “in” and store it as an array of type “DestructureLHS<A>[]” according to the updated AST. 
  
  * **Type-Check** : We need to loop and typecheck all LHS expressions with the iterables return types. 
  * **Lower** : We need to loop and assign each LHS assignment with the respective iterable.

## Front-end user interface
```
a : int = 0
b : int = 0
a,b = 5,6
print(a)
print(b)
```
  
**Expected Output**  

5

6

**Changes Required**
* Front end doesn’t have points of overlap with Destructuring Assignment.
* Code changes made by the Front end team do not influence the Destructuring Assignment and vice-versa. 
* Although the Front end team intends to show the variables on the heap, we do not technically need to make any changes to support it.
  
## Generics and polymorphism

```
T: TypeVar = TypeVar('T')

class Adder(Generic[T]):
   def add(self: Printer, x: T, y: T) -> T:
      return x + y

x : int = 0
y : int = 5
a: Adder[int] = None
a = Adder[int]()
x, y = a.add(4, 6), a.add(4, 5)
print(x)
print(y)
```
  
**Expected Output**  

10
  
9
  
**Changes Required**
* If the basic implementation works from both the teams, we would not need additional changes to support this case. 
* Generics are represented by classes and member functions and are parsed as _Expr_ and thus should work with Destructuring Assignment out-of-the box.
  
  
## I/O, files
  
```
f : File = None
f = open('test', 'rb')
f1 : File = None
f1 = open('test1', 'w')

a : int = 0
b : int = 0

a, b = f.read(), f1.write(4)
f.close()
f1.close() 
```
  
**Expected Output** 
The expected output should contain the first byte read by file pointer f and the success code returned by file pointer f1.   
  
**Changes Required**  
* Output from file pointers would be encapsulated in an _Expr_, it should work with Destructuring Assignment by default.
  
  
## Inheritance
```
class A(object):
  a : int = 1
class B(A):
  b : int = 2
  
x : B = None
x = B()
y : int = 0
z : int = 0
y , z = x.a , x.b
print(y)
print(z)  
```  
  
**Expected Output** 

1
  
2  
  
**Changes Required**    
* Destructuring can be implemented in a couple of places here and referenced later. 
* It can be present in Super class / and Sub class and the variables can be used later. 
* Since super class support is added as part of Class in _AST_, as long as the Class and methods are parsed correctly, it should work with Destructuring Assignment.
  
## Lists

```
lst : [int] = None
lst = [1, 2, 3, 4]
a : int = 0
b : int = 0
c : [int] = None
a,b,*c = lst
print(a)
print(b)
print(c)

```
  
**Expected Output** 

1
  
2
  
[3,4]  
  
  
**Changes Required** 
* We wouldn’t need any changes in _Parser_ and _AST_ as the Lists team would be handling the support of “ArrayExpression” parsing. 
* For TypeChecker, we will be constraining the supported types for destructuring on RHS including non-paranthesized expressions, lists, tuples, sets, dictionaries and strings. 
* We would also need to support checking the length and the type of arguments on the LHS and RHS for the list cases.
  
E.g.
  
a,b,c = [1,2,3]
  
a,b,c = [1,2,[3,4]]
  
a,b,c = [1, 2, 3, 4]
  
a,b,*c = [1,2,3,4]

* The current algorithm that we use for type checking should be extensible to other custom types as well with very little modifications.  
* In _Lower_, we will add support for when RHS is of tag “listliteral”, and we have to destructure the individual elements of list assigning them to LHS, or assign lists when we have starred expressions.
  
  
  
## Memory management
```
class C(object):
  i: int = 0
    
def foo(x: int) -> int:
  c: C = C()
  test_refcount(c, 1)
  return 1
x : int = 0
y : int = 0
x,y = foo(10), foo(20)
```
  
**Expected Output**   

1
  
1  
  
**Changes Required**      
* Since the Memory Management team is using the builtin function test_refcount, and no destructuring happens in the memory management portion, there is no intersection between the 2 features. 
  
  
  
## Optimization
  
### Before Optimization  
  
```
x:int = 1
y:int = 2
a:int = 0
b:int = 0
a, b = 2 * (x+y), 3 * (y + x) + 5 * (x+y)
print(x)
print(y)
```

### After Optimization  
  
```
x:int = 1
y:int = 2
a:int = 0
b:int = 0
e:int = 0
e = x + y
a, b = 2 * e, 3 * e + 5 * e  
```  
  
**Expected Output**

6

24  

**Changes Required** 
* In order to support optimization within destructuring, the optimization team needs to add the destructuring case in optimize-ast.ts. 
* This will enable support for dead code removal, CFA, etc,. in Destructuring Assignment.
  
## Sets and/or tuples and/or dictionaries

```  
set_1 : set[int] = None
set_1 = {1,2}
set_1.add(3)

a,b,c = set_1
print(a)
print(b)
print(c)  
```

**Expected Output**
  
1
  
2
  
3  

**Changes Required** 

* We won’t need any changes in *Parser* and *AST*, as the Sets team would be handling the support of "SetExpression" parsing. 
* For TypeChecker, we will be constraining the supported types for destructuring on RHS including non-paranthesized expressions, lists, tuples, sets, dictionaries and strings. 
* The DA team will be supporting checking the length and the type of arguments on the LHS and RHS for the set/tuple/dict cases. 

E.g.

a,b,c = {1,2,3}
  
a,b,c = {1,2, {3,4}}
  
a,b,c = (1, 2, 3, 4)
  
a,b,*c = {1,2,3,4}

* The current algorithm that we use for type checking should be extensible to other sets and dictionaries as well with very little modifications.  
* In _Lower_, we will add support for when RHS is of tag “bracket”, and we have to destructure the individual elements of list assigning them to LHS, or assign sets when we have starred expressions.  
  
  
## Strings
  
#### Case 1  

```  
s1:str = "abc"
s2:str = "cba"
s3:str = "adc"

a : str = "x"
b : str = "y"
c : str = "z"

a,b,c = s1, s2, s3
print(a)
print(b)
print(c)
```

#### Case 2
  
```
s1:str = "abc"
a : str = "x"
b : str = "y"
c : str = "z"

a,b,c = s1
print(a)
print(b)
print(c)
```
  
 
**Expected Output**

#### Case 1

```
abc
  
cba
  
adc
```

#### Case 2
  
```
a
  
b
  
c
```
  
  
**Changes Required** 
  
* For case 1, if the basic implementation works from both the teams, we would not need any additional changes to support this case.
* For case 2, we would not need any changes in Parser and AST to support this specific case. We do need changes in the TypeChecker to validate the length of the string against LHS length and types. In Lower, if we encounter the RHS as just one string, we will unpack like lists/sets to each LHS value.
