## Lists conflicts

### Bignums
The only conflict that is between our group and the Bignums group is that they have changed numbers to their own data structure of a bignum. This data structure is specifically that a number points to a memory address related to the number of 4 bytes blocks that the number occupies. Our lists should be capable of storing these.

*Input*
```python
a : [int] = [1, 2, 3]
i : int = 0
print(a[i])
```
*Expected Output*
```python
>>> 1
```

Additionally, the way we index needs to also be changed as we do a binop between the index passed in and the value 1. We also need to use a i32 type to pass into the call to loading from memory. The Strings group and our group have requested a method to convert a Bignum to a i32 value. However, as we wrote indexing functionality in lower.ts, we also need binop to support i32 operations and not assume the operands are bigints.


### Built-in libraries/Modules/FFI

*Input:*
```python
print(len([1,2,3,4,5]))
print([1,2,3])
```

*Expected output:* 
```
5
[1, 2, 3]
```

We may need to coordinate with the built-in libraries group to ensure that they are able to implement functions like `print` and `len` shown above. This would require an understanding of how we have our lists laid out in memory. It does not seem like we will need to add or change anything about our implementation to make our features work together, but the other group will have to refer to our implementation to understand how to find the elements in the list and how to make a new list.

### Closures/first class/anonymous functions

There is no conflict with this group because they are using classes to represent closures. An instance of a class is represented as an address in memory, and in our implementation, each element in a list of objects would be an address. In a list of closures, each element would also need to be an address. Since "closures are all translated to class definitions and initializations" according to the group's design document, we don't need to add anything additional because we already have this correct functionality in place for classes.

### Comprehensions

*Input:*
```python
[num * 2 for num in range(5)]
```

*Expected output:* 
```
[0, 2, 4, 6, 8]
```

Our features would interact in a test case such as the one shown above. Similar to other groups that may be implementing something that involves lists, this group would need to understand the way we represent lists in memory so that they can create lists and modify the values of the elements in the list.

### Destructuring assignment

*Input:*
```
a: int = 0
b: int = 0
c: int = 0

a, b, c = [0, 1, 2]

print(a)
print(b)
print(c)
```

*Expected output:* 
```
0
1
2
```

For a test case like the one above, it may be helpful to know the length of the list on the right-hand side of `=`. We have the length of the list stored as metadata in memory, so the comprehensions group could look at our design document to figure out how to get the length of a list. Our group would not need to make any changes.

### Error reporting
*Input*
```python
a : [int] = None
a = [1, 2, 3, 4]
a[4]
```
*Expected Output*
```python
>>> RUNTIME ERROR: list index out of range
```
For now their implementation of runtime error has no out of bound error which may be caused by list and string. We have already had a check out-of-bound function in our webstart.ts so we need to change the plain throw new Error to their runtime error interface.
They have a different properties for type SourceLocation to make the error reporting message have more precise column number of error line. We can follow their config to modify our implementation.

### Fancy calling conventions
*Input*
```python
a : int = 0
b : int = 0
c : [int] = None
a, b, *c = [1, 2, 3, 4]
c
```
*Expected Output*
```python
>>> [3, 4]
```
Not sure if they're going to implement multiple assignment in one line but it looks fancy to me.
Parser: The fancy group may need to handle the assignment of int and list variable and retrieve right values from the rhs list literal.
Type Check: No need to change. Once it's parsed in the right format, the current type-checker algorithm can deal with it well. 
Lower: The result can be achieved by our current implementation. But what we do now is to allocate the list literal first, and store it like[“ListLength”, elem1, elem2, elem3, …]. So if c would like to be a list, it has to be copied rather than assigning the reference of this list back since the very front value doesn’t represent any length information.

### for loops/iterators
*Input*
```python
a : [int] = [1, 2, 3]
i : int = 0
for i in a:
    print(i)
```
*Expected Output*
```python
>>> 1
>>> 2
>>> 3
```
Their current implementation requires an iterable object(like range) with certain functions hasNext and next to iterate through it. We made list a type for type check and use listLiteral and index lookUp/assign with it instead of having a written Python class for it(or just wasm code) and that means our list has no next() and hasNext() function which makes it not iterable. May need to add these functions to support list maybe in wasm function. 

### Front-end user interface
I believe this team doesn’t have much to do with us. They focus more on the web page rather than how the code being compiled where most of the team work. One thing I noticed from their design is that they’re going to support the space that heap has used. Even though our design is highly related to memory, the memory management team takes more responsibility of the overall memory system. So they may need to communicate with each other.

### Generics and polymorphism
*Input*
```python
T : TypeVar = TypeVar("T")
def a(x : T, y : T) -> [T]:
    ret : [T] = None
    ret = [x, y]
    return ret
    
i : int = 1
j : int = 2
x : [int] = None
x = a(i, j)
x
```
*Expected Output*
```python
>>> [1, 2]
```
The above code can be done with our current design for list and some modification for their remove-generics.ts. They do remove-generic before type-checking. That is to say our type-check for list would be just the case without generic var so no need for change in type-check and lower. 

### I/O + files
Lists and I/O do not really interact much. I/O is on a functional layer that is abstract from lists. The only real interaction between I/O and lists would be if input from a file is being stored directly into a list, but it is more likely that only single characters, bytes, or strings are read, and they will be read one at a time into a list. Input from a list would have to be very specific, and the file would have to be formatted in a specific way. This is more than likely unnecessary. Another interaction would be outputting a list to a file, but as only single units are read, there should also only be single units written, so lists would more likely be used in a for loop.

*Input*
```python
a: [int] = None
a = [1, 2, 3]

fo = open("test.txt", "w")
for i in a:
    fo.write(str(i) + "\n")

fo.close()
```

The file would be expected to hold "1\n2\n3\n".

### Inheritance
Inheritance does not interact with lists unless lists are capable of being used as a base class. Typically, this is the case in Python as lists are subclassable. However, in our current implementation of the compiler, lists are not subclassable, as they do not have full functionality of a class and are currently not consider classes in the AST.

However, in the next week, when our group adds methods for lists, we may change lists to be a built-in class. This will mean inheritance should be possible.

*Input*
```python
class MyList(list):
    def __init__(self, *args):
        list.__init__(self, *args)
        self.append('End')

my_list = MyList(["a", "b", "c"])
print(my_list[3])
```
*Expected Output*
```python
>>> End
```

The following would mean that when an object of type MyList is created, it will have an element of value 'End' at the end of it. There should not necessarily need to be any changes on the side of the Inheritance group to make this work, as if list works exactly like a class with only additional features, inheriting from list would be the same as inheriting from a class.
>>>>>>> Stashed changes

### Memory management

Based on the memory management group's test cases, there will not really be any conflicts. There are test cases to check how many references were created. If we created a list `[0, 1, 2]`, only 1 reference is created, which is what is expected. One thing we might want to add later on, depending on how our group chooses to implement things like `append()` and `remove()`, we may need to allocate new memory. So we may want to work with the memory management group on that.

### Optimization
The Optimization group has some correlation to our group as they are optimizing binary operations by folding. They may be able to fold comparisons of list literals (which would primarily only be the equality/inequality operator). However, for lists is a variable, the values of the list are not known until runtime, so folding is not possible.
```python
l1: [int] = [1, 2, 3]
l2: [int] = [1, 2]
print(l1 == l2)
```
After optmization:
```python
l1: [int] = [1, 2, 3]
l2: [int] = [1, 2]
print(False)
```
This would only require changes in the Optimization group's fold code. We would not really have to change anything in our group's code.

### Sets and/or tuples and/or dictionaries
Our features overlap in the the indexing methods. We would need to make sure that indexing can differentiate between strings, lists, and dicts.

*Input*
```python
a = [(1, 2), (3, 4), (5, 6)]
print(a[0][1])
```
*Expected Output*
```python
>>> 2
```

The sets group has not implemented tuples or dictionaries yet. Thus, the Strings group and our group have settled on unified indexing implementation as well as out of bounds error handling. The sets group may follow our implementation in order to not cause merge errors. More is detailed below.

### Strings
Our features overlap in the the indexing methods. We would need to make sure that indexing can differentiate between strings and lists.

*Input*
```python
a = ["abc", "def", "ghi"]
a[1] = "a"
print(a[0][1])
```
*Expected Output*
```python
>>> b
```

We will need to make sure that parsing, type-checking, and lowering can differentiate between strings and lists. We would also need to make sure most of the other code in these files do not cause merge conflicts. Additionally, our groups have agreed upon a unified out of bounds method that calls a runtime error if an index is out of bounds.
