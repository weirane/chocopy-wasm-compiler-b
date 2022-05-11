import {assertTC, assertTCFail, assertPrint} from './asserts.test';
import {NUM, BOOL, NONE} from '../utils';

describe('closure: the Callable type', () => {

  assertTC("Callable TypeDef: int -> int", `
f: Callable[[int], int] = None  
  `, NONE);

  assertTC("Callable TypeDef: bool -> bool", `
f: Callable[[bool], bool] = None  
  `, NONE);

  assertTC("Callable TypeDef: int -> int -> int", `
f: Callable[[int, int], bool] = None  
  `, NONE);

  assertTC("Callable TypeDef: int -> int -> None", `
f: Callable[[int, int], None] = None  
  `, NONE);

  assertTC("Callable var assign: None", `
f: Callable[[int], int] = None  
f = None
  `, NONE);

  assertTC("Callable var assign: same func type", `
f: Callable[[int], int] = None  
g: Callable[[int], int] = None  
f = g
  `, NONE);

  assertTCFail("Callable var assign: different arg type", `
f: Callable[[int], int] = None  
g: Callable[[bool], int] = None
f = g
  `);

  assertTCFail("Callable var assign: different arity", `
f: Callable[[int], int] = None  
g: Callable[[], int] = None
f = g
  `);

  assertTCFail("Callable var assign: primitive type", `
f: Callable[[int], int] = None  
f = 1
  `);
})

describe('closure: func in func', () => {

  assertTC("just one func in func", `
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
  `, NONE);

  assertPrint("the returned function can be called", `
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
print(getAdder(1)(2))
  `, ["3"])

  assertTC("assign a closure to a global variable", `
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
f: Callable[[int], int] = None
f = getAdder(1) 
  `, NONE);

  assertPrint("assign closure and call", `
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
f: Callable[[int], int] = None
f = getAdder(1) 
print(f(2))
  `, ["3"])


  assertPrint("the returned closures are different objects", `
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
f: Callable[[int], int] = None
f = getAdder(1) 
g: Callable[[int], int] = None
g = getAdder(1) 
print(f is g)
  `, ["False"])

  assertPrint("pass the same closure around and use `is` operator", `
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
f: Callable[[int], int] = None
f = getAdder(1) 
g: Callable[[int], int] = None
g = f
print(f is g)
  `, ["True"])

  assertPrint("lexical scoping", `
def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
a: int = 10
f: Callable[[int], int] = None
f = getAdder(1) 
print(f(2))
  `, ["3"])

})
