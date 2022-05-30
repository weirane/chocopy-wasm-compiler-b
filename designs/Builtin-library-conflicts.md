# Conflicts

## Bignums

It overlaps with our team's implementation.

For example:

```python
print(1)
```

Since in bignums team every number is stored in heap, our implementation needs two extra steps in our implementation: 

	1. decode numbers on the heap to a bigint in JS.
	1. encode the computed result and return it.

And also, since now numbers are on the heap, we can nolonger use i32.add/i32.minus/..., instead we need to introduce several basic builtin function like add and minus in JS which can handle the encode and decode logic.

## Closures/first class/anonymous functions

Right now there are no conflicts here, since our implmentation now only focus on basic functions like math, time and sleep. 

But in future, we might introduce map/reduce, which is highly related to this group.

## Comprehensions

There are no conflicts here, since we now only focus on basic functions like math, time and sleep. But in the future, we might give some fancy built-in functions about comprehension.

For example

```python
<expr> for <name> in <iterable-expr> [if <expr>]?
```

Any built-in functions are just like any other functions. In principle, there is no intersection here.

## Destructuring assignment

There are no conflicts here, since we now only focus on basic functions like math, time and sleep.

For example:

```python
a:int = 0
b:int = 0
a, b = max(5,6), 10
```

In here, the builtin function max just return a value like any other functions.


## Error reporting
We do not have any conflicts with the error reporting team. 
For example: 

```python

print(1/0)

```
In this code snippet, it reports a runtime error of divding by 0. Our built-in functions do not deal with reporting errors. Thus, it does not interact with our built-in functions. 


## Fancy calling conventions
We do not have any conflicts with fancy calling conventions team so far. Moreover, they specifically mentioned that their features do not affect built-in libraries/functions in their design.md. 

For example
```python
comb(3, 4)
```

In this snippet, it computes the combinatorial of (3, 4). In our implementation, we do not allow positional arguments. Thus, our design does not contradict with the fancy calling convention group. 

## For loops/iterators
So far, we do not have any conflicts. However, we might need to implement methods such as "range" to support for loop feature. 

For example
```python
for i in range(6):
	print(i)
```

We need to further discuss this feature with the for loop group to determine who is responsible for this implementation. 


## Front-end user interface
There is no conflicts/interaction between UI and builtin libraries.

## I/O, files

I/O, files team implemented file manipulate functions in io.ts. So far we don't have any conflicts. 

```python
f : File = None
f = open('test', 'rb')
f.close()
f.read()
```
The above builtin functions were written in io.ts by I/O team.

## Generics and polymorphism

We mainly worked on Math, time and sleep for this week. Hence, there is no direct conflicts so far. 

## Inheritance

There is no direct conflicts with inheritance and  builtin libs. Inheritance usually handles in case "call_indirect", and our main changes is in case "call".

```python
class List(object):
    def sum(self : List) -> int:
        return 1 
class Empty(List):
    def sum(self : Empty) -> int:
        return 0
class Link(List):
    val : int = 0
    next : List = None
    def sum(self : Link) -> int:
        return factorial(self.val) + factorial(self.next.sum())
    def new(self : Link, val : int, next : List) -> Link:
        self.val = val
        self.next = next
        return self

l : List = None
l = Link().new(3, Link().new(2, Empty()))
print(l.sum())
```

Expected Output is 8. 

## Lists
There's still no conflict with the list group so far. However, we might need to implement some built-in functions such as "len" and "append" to determine the length of the list. 

For example:
```
l:List = []
l.append(1)
print(len(l))
```

The expected output is l is 1. This involves memory read/write, so we need to discuss with the list group to see how they store the length and its values in WASM memory. 


# Summarize the remaining features

We may wanna support built-in functions like map and reduce. And also we wanna be able to print an object.

Test cases:

```python
set_1 : set[int] = None
set_1 = {1,2}
max(set_1) #output should be 2
```

```python
def f(a:int, b:int)->int:
	return a + b
x:List[int] = None
x = [1,2,3,4,5]
reduce(f,a,3) #should output 18
```

```python
x:List[int] = None
x = [1,2,3,4,5]
map(pow,a) #should output [1,4,9,16,25]
```

## Memory Management

There are no conflicts here right now. Our implmentation now only focus on basic functions like math, time and sleep, while the memory management focus on some techniques like reference counting.

## Optimization

There are no conflicts here. The optimization focus on some techniques like Constant Folding and Constant Propagation. It can simplify the python code but will have conflicts with us.

## Sets and/or tuples and/or dictionaries

There are no conflicts here. However, they have already supported some build-in functions like `len()`. This build-in function is relevant to their implementation of the set (they implement the set using hash table) and it seems that we don't need to support them. One thing we need to pay attention to is the print function. We need to intergrate the `print_set` into the print function, which they still haven't finished.

```typescript
switch (arg.a[0]){
            case NUM:
              argCode.push("(call $print_num)");
              break;
            case BOOL:
              argCode.push("(call $print_bool)");
              break;
            case NONE:
              argCode.push("(call $print_none)");
              break;
					  case SET:
    					// print_set will be implemented by them
    					argCode.push("(call $print_set)");
              break;
            default:
              throw new RunTimeError("not implemented object print")
```



## Strings
There are no conflicts here. Similarly, they have already implemented some build-in functions like `len()`. And they have 	`print_str ` function which we also need to integrate into the built-in function `print`.
