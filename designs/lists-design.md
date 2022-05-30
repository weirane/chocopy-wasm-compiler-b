# Week 9 Update (5/27/22)

## New Test Cases for Lists

### 1. Print a list

*Input:*
```
a: [int] = None
a = [1, 2, 3]
print(a)
```
*Output:*
```
[1, 2, 3]
```
---

### 2. Obtain length of a list

*Input:*
```
a: [int] = None
a = [1, 2, 3]
print(len(a))
```
*Output:*
```
3
```
---

### 3. Functional negative indexing of a list

*Input:*
```
a: [int] = None
a = [1, 2, 3]
print(a[-1])
```
*Output:*
```
3
```
---

### 4. Basic list slicing
*Input:*
```
a: [int] = None
b: [int] = None
a = [2, 4, 6, 8]
b = a[0:2]
print(b)
```
*Output:*
```
[2, 4]
```
---

### 5. List slicing with step
*Input:*
```
a: [int] = None
b: [int] = None
a = [2, 4, 6, 8]
b = a[0:3:2]
print(b)
```
*Output:*
```
[2, 6]
```
---

### 6. List slicing with negative step
*Input:*
```
a: [int] = None
b: [int] = None
a = [2, 4, 6, 8]
b = a[::-1]
print(b)
```
*Output:*
```
[8, 6, 4, 2]
```
---

### 7. Append an element to a list
*Input:*
```
a: [int] = None
a = [1, 2, 3]
a.append(4)
print(a)
```
*Output:*
```
[1, 2, 3, 4]
```
---

### 8. Copy a list
*Input:*
```
a: [int] = None
b: [int] = None
a = [1, 2, 3]
b = a.copy()
a.append(4)
print(b)
```
*Output:*
```
[1, 2, 3]
```
---

### 9. Insert an element into a list
*Input:*
```
a: [int] = None
a = [1, 2, 3]
a.insert(1, 4)
```
*Output:*
```
[1, 4, 2, 3]
```
---

### 10. Pop an element from a list
*Input:*
```
a: [int] = None
a = [1, 2, 3]
a.pop(-1)
print(a)
```
*Output:*
```
[1, 2]
```
---

### 11. List variable concatenation
*Input:*
```
a: [int] = None
b: [int] = None
c: [int] = None
a = [1, 2, 3]
b = [4, 5, 6]
c = a + b
print(c)
```
*Output:*
```
[1, 2, 3, 4, 5, 6]
```
---

### 11. List literal concatenation
*Input:*
```
a: [int] = None
a = [1, 2, 3] + [4, 5, 6]
print(a)
```
*Output:*
```
[1, 2, 3, 4, 5, 6]
```

## Milestone 2 Summary
Our main objectives for this week are implementing built-ins to work with lists (specifically print() and len()), fully implementing list slicing, and implementing a few built-in functions that typically come with Python lists. This may require a major change to make list into a functional class. As we implement these functions, they may require a dynamic resizing of lists, so we will probably need to change the layout of data for lists in memory. 

Lists will still go on the heap, and when a list is assigned to a variable, that variable will still store the address of the list on the heap. At this address will still be the number of elements in the list. However, instead of having the values of the list immediately after that, we will have store another address. This address will then point to another place in memory which contains the values of the list. At this address, each value in the list will be stored in consecutive 4-byte blocks of memory. To calculate the address of a specific element in the list, it would be `(the value at (address of the list + 4)) + (4 * index)`.

Example:

*Input:*
```
a: [int] = None
a = [9, 8, 7]
```
*Heap:*
```
4     8     
 ----- ----- 
|  3  | 104 |
 ----- ----- 
 
104   108   112
 ----- ----- -----
|  9  |  8  |  7  |
 ----- ----- -----

`a` stores the address 4.
```


# Week 8 Update (5/20/22)

*Update 5/15/22: This program now produces an error message that says `Error: RUNTIME ERROR: cannot perform operation on none`. This error message is just a placeholder for now to get any (index >= length of list) to throw a runtime error. Bad memory modification is no longer allowed.*

*Update 5/17/22: The error message now says `Index ${index} out of bounds`. We also fixed the negative index test to pass, but we are considering adding functional negative indexing in the future.*

*Update 5/18/22: Move check-index from being implemented in ir to purely in lower.ts*

*Update 5/23/22: Update all indexing to be unified with Strings group's implementation, as well as the out of bounds error function.*

# Week 7 Update (5/13/22)

We were not able to get all 10 of our test cases from last week to pass. Tests 1, 2, 3, 6, 7, 8, 9, and 10 pass, but tests 4 and 5 do not yet behave as we eventually intend them to.

We currently have some basic list functionality implemented. A list can be created by enclosing a series of comma-separated values in square brackets. Currently, all the elements in the list must be of the same type. Elements can be accessed using the `listname[index]` syntax, and elements can also be assigned using the `listname[index] = newvalue` syntax.

The tests that do not yet behave as we want are the ones that were supposed to have `index out of bounds` errors. We knew that this would be a runtime check, but we did not realize initially that in order to print the error message, we would need to add a call to a new TypeScript function from the WASM that would print this error message.

One challenge we encountered when trying to add this runtime check was working with the IR. Before we had the IR, we could directly write the assembly code needed for each kind of expression or statement, such as the code to load a value at a specific address, add 1 to it, and use it in the next operation. Now, with the IR, it seems like we have to figure out how that code would look like in the IR format, so that `compiler.ts` can generate the WASM. We are thinking about some different ways to approach this.

We were not expecting to be able to implement lists of any type other than `int` or `bool` this week, but we actually were able to implement it for objects as well, which is reflected in the new test cases we've added. A list of a certain object type can also have `None` elements inside it.

Here are some test cases that we know are behaving in an undesireable way, which we plan to work on next: (this is for us just as much as the instructors!)
```
a: [int] = None
b: int = 100

a = [1, 2, 3]
a[3] = 99999999

b
```
*Output:* `99999999`

The way that it is right now, we are able to assign elements to indexes are out of bounds. This is pretty bad because we could modify the memory of other parts of the program. In the above example, setting `a[3]` to `99999999` actually modifies the value of `b`. Even if we can't get the proper `index out of bounds` error yet, we hope to make this at least produce a WASM error so that this bad memory modification is not allowed.

---

```
a: [int] = None
a = [66, -5, 10]
a[1+0]
```
*Output:* `66`

Whenever the index expression is anything other than a literal value, the index access is off by 1. This is due to the way we have our lists laid out in memory (scroll to the very bottom of this file to see). In order to access the element at index `i`, the offset for the load needs to be `i+1`. Currently when we lower the code and make the `"load"` expression, we're just adding 1 to whatever the index evaluates to, which works for literal numbers. However, for anything other than a literal, the `IR.Value` will be an `"id"`, so we can't directly add 1 to that. We are still figuring out what to do about that.

*Update 5/14/22: We figured it out. It now produces the output `-5`, which is correct.*

---

```
a: [bool] = None
a = []
```
*Output:* `Error: TYPE ERROR: Non-assignable types`

This shouldn't have any errors, as an empty list should be assignable as a list of booleans. We are still trying to figure out what type to respresent the empty list as, maybe as a list of some sort of "any" type that another group will come up with.

*Update 5/17/22: We fixed this by setting the empty list to a list of type none, and checking this case specially.*

---

```
a: [[int]] = None
a = [[100, 4], [5], [99, -7, 3]]
a[0][1]
```
*Output:* `1`

For some reason we haven't figured out yet, the last element of each list in this list always seems to come out as `1`. All the other list accesses seem to give the value that we expect, but `a[0][1]`, `a[1][0]`, and `a[2][2]` all evaluate to `1`.

*Update 5/15/22: We figured this one out as well. Allocating (num elements + 1) spots for each list instead of just (num elements) spots fixed the problem. This program now correctly outputs `4`, and `a[1][0]` and `a[2][2]` correctly evaluate to `5` and `3`, respectively.*

# Week 6 Update (5/6/22)

## Test cases for lists


### 1. Create a list with some elements in it

*Input:*
```
a: [int] = None
a = [1, 2, 3]
```
*Output:*
(no output)

---

### 2. Create a list with no elements in it

*Input:*
```
a: [int] = None
a = []
```
*Output:*
(no output)

---

### 3. Access an element in the list

*Input:*
```
a: [int] = None
a = [2, 4, 6, 8]
a[0]
```
*Output:*
```
2
```

---

### 4. Access an element, out of bounds
*Input:*
```
a: [int] = None
a = [2, 4, 6, 8]
a[4]
```
*Output:*
```
Error: RUNTIME ERROR: Index 4 out of bounds
```
---

### 5. Access a negative index
*Input:*
```
a: [int] = None
a = [1, 2, 3]
a[-1]
```
*Output:*
```
Error: RUNTIME ERROR: Index -1 out of bounds
```
---

### 6. Elements of the lists are expressions
*Input:*
```
a: [int] = None
b: int = 100
a = [1 + 2, b, (-50)]
print(a[0])
print(a[1])
print(a[2])
```
*Output:*
```
3
100
-50
```
---

### 7. Store an element at a certain index in the list
*Input:*
```
a: [int] = None
a = [1, 2, 3]
a[0] = 5
a[0]
```
*Output:*
```
5
```
---

### 8. Replace the reference for a list with a new one
*Input:*
```
a: [int] = None
a = [1, 2, 3]
a = [4, 5, 6, 7, 8, 9]
a[4]
```
*Output:*
```
8
```
---

### 9. Assign an element of the wrong type
*Input:*
```
a: [int] = None
a = [1, 2, 3]
a[2] = True
```
*Output:*
```
Error: Expected type `int`, got type `bool`
```
---

### 10. Create a list of type bool
*Input:*
```
a: [bool] = None
a = [True]
```
*Output:*
(no output)


## Changes to the AST/IR
(added some code in ast.ts)

- For tag "listliteral": this will represent list literals in the code, for example `[1, 2, 3]`. Each element in the list is an expression, so the AST representation consists of a list of expressions.
- For tag "listlookup": represents an element lookup, for example `a[0]`. The list to look in is an expression (some examples: a name `a[0]`, a list literal `[4, 5, 6][0],` a list lookup `a[1][0]`). The index to lookup is also an expression.
- For tag "listelementassign": represents a statement to assign a new value to a certain index in a list. The list, the index to assign, and the value to assign are all expressions.

Changes to the IR:
- In `flattenExprToExpr()` in `lower.ts`, we will need to add cases for the tags "listliteral" and "listlookup".
  - "listliteral" will require: `IR.Value`s for the elements in the list, `IR.Value`s to indicate the address to store each of these values, and `Stmt`s with the tag "store" to store these values at the indicated address
  - "listlookup" will require: statements to get the address of the array to look in, an `IR.Value` for the index to look up, and an `IR.Expr` with the tag "load" to get this value.
- In `flattenStmt()` in `lower.ts`, we will need to add a case for the tag "listelementassign". It should look similar to the case for the tag "field-assign", except we would calculate the offset using the given index instead of the field name.

## New datatypes
(added some code in ast.ts)

New `Type` with the tag "list", where the element `type` represents the intended type of all the elements in the list.


## Description of the value representation and memory layout
The lists will go on the heap, and when a list is assigned to a variable, that variable will store the address of the list on the heap. At this address will be the number of elements in the list. After that, each value in the list will be stored in consecutive 4-byte blocks of memory. To calculate the address of a specific element in the list, it would be `(address of the list) + (4 * (index + 1))`.

Example:

*Input:*
```
a: [int] = None
a = [9, 8, 7]
```
*Heap:*
```
4     8     12    16
 ----- ----- ----- -----
|  3  |  9  |  8  |  7  |
 ----- ----- ----- -----

 `a` stores the address 4.
```