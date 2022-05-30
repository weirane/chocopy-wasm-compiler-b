# Design of Optimization on Compiler B Week8 Milestone 2

## A. Test cases / Scenarios

> New features we plan to add for milestone 2

### 1. (IR) Liveness Analysis
We are thinking about doing a backward lookup and maintaining a live set for all variables, and potentially count referring instructions for each variable.

**Pseudocode**
```python
def g(a:int, b:int) -> int:
L1  tmp = 0
L2  if (a > b) then l3 else l8
L3  tmp = a / b
L4  tmp = tmp + b
L5  call f(tmp, a)
L6  a = a - 1
L7  goto l2
L8  return tmp
```
> `U` denotes unknown set

**Living Var - Pass 1**
```python
L1 a, b
L2 a, b
L3 a, b
L4 tmp, a, b
L5 a, tmp
L6 a, tmp
L7 U
L8 tmp
```

**Living Var - Pass 2**
```python
L1 a, b
L2 a, b, tmp
L3 a, b
L4 tmp, a, b (idential to L4 - Pass 1, finish)
L5 a, b, tmp
L6 a, b, tmp
L7 a, b, tmp (from L2)
L8 tmp
```

### 2. (IR) Eliminate instructions that only affects dead variables

**Before Optimization**
```python
def g() -> int:
  a: int = 1
  b: int = 2
  a = a + 1
  b = b + a
  return a
```

**After Optimization**
```python
def g() -> int:
  a: int = 1
  a = a + 1
  return a
```

### 3. (IR) Constant Propagation

**Before Optimization**
```python
x:int = 100
y:int = 10
y = x + 1
x = x + x
```
**After Optimization**

```python
y:int = 10
y = 100 + 1
x = 100 + 100
```

## B. Modification on AST and IR
We intent to keep the definition of AST and IR intact, and optimization on AST or IR will be implemented in the manner of AST $\rightarrow$ AST or IR $\rightarrow$ IR.


## C. New changes
We plan to implement our optimizations at `IR` level for two reasons. 
  - Groups make significant modifications at `AST` whereas remain `IR` largely intact. Thus out optimization on `IR` can be more compatible.
  - Analysis at `IR` is more general and easier to implement due to the limited set of control flows.

Despite that, there will be no changes to the structure of `IR`, lowering process as well as the code generation. However, we will parameterize the compile-runner to allow more fine-grained control over passes ON/OFF.

## D. Test

We plan to add a few global boolean flag variables and more self-defined test cases in the optimization step so that we could test different optimization features separately. Besides, we will also refer to the test cases of other teams to make sure we did not introduce other bugs into compiler B.

## E. Value Rep and Memory Layout
We will not change how value is represented or how they are buffered in the memory.