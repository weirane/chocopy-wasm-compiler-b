import { Type } from './ast';
import { RunTimeError } from './error_reporting';
import { BOOL, NONE, NUM } from './utils';

type BuiltinFunc = {
  name: string
  body: Function
  typeSig: [Type[], Type]
}
// here to register builtinFunctions
export const BuiltinLib:BuiltinFunc[] = [
  {
    name: "factorial",
    body: factorial,
    typeSig: [[NUM], NUM]
  },
  {
    name: "randint",
    body: randint,
    typeSig: [[NUM,NUM], NUM]
  },
  {
    name: "gcd",
    body: gcd,
    typeSig: [[NUM,NUM], NUM]
  },
  {
    name: "lcm",
    body: lcm,
    typeSig: [[NUM,NUM], NUM]
  },
  {
    name: "comb",
    body: comb,
    typeSig: [[NUM,NUM], NUM]
  },
  {
    name: "perm",
    body: perm,
    typeSig: [[NUM,NUM], NUM]
  },
  {
    name: "randrange",
    body: randrange,
    typeSig: [[NUM,NUM, NUM], NUM]
  },
  {
    name: "time",
    body: ()=>Date.now()%1000000000,
    typeSig: [[], NUM]
  },
  {
    name: "sleep",
    body: sleep,
    typeSig: [[NUM], NONE]
  },
  {
    name: "int",
    body: (x:any)=>x,
    typeSig: [[BOOL], NUM]
  },
  {
    name: "bool",
    body: (x:number)=>x!=0,
    typeSig: [[NUM], BOOL]
  },
  {
    name: "abs",
    body: Math.abs,
    typeSig: [[NUM], NUM]
  },
  {
    name: "min",
    body: Math.min,
    typeSig: [[NUM, NUM], NUM]
  },
  {
    name: "max",
    body: Math.max,
    typeSig: [[NUM, NUM], NUM]
  },
  {
    name: "pow",
    body: Math.pow,
    typeSig: [[NUM, NUM], NUM]
  }
]


function factorial(x:number):number{
  return x>0 ? x*factorial(x-1): 1 
}

function randint(x:number, y:number):number{
  if(y<x) 
    throw new RunTimeError("randint range error, upperBound less than lowerBound");
  return Math.floor(Math.random()*(y-x+1) + x);
}

function gcd(a:number,b:number):number{
  if (a<0 || b<0 || a==0 && b==0)
    throw new RunTimeError("gcd param error, eq or less than 0");
  return b==0 ? a : gcd(b,a % b);
}

function lcm(x:number, y:number):number{
  if (x<=0 || y<=0 || x==0 && y==0)
    throw new RunTimeError("lcm param negative error, eq or less than 0");
  return Math.floor(x*y/gcd(x,y))
}

function comb(x:number, y:number):number{
  if (x < y || x < 0 || y < 0)
    throw new RunTimeError("comb param error");
	return perm(x, y) / perm(y, y)
}

function perm(x:number, y:number):number{
  if (x < y || x < 0 || y < 0)
    throw new RunTimeError("perm param error");
  let result = 1
  for (var i = 0; i < y; i++) {
    result *= (x - i)
  }
  return result
}
function randrange(x:number, y:number, step:number){
  if(y<x) 
    throw new RunTimeError("randrange range error, upperBound less than lowerBound");
  let result = randint(x, y)
  while ((result - x) % step !== 0) {
    result = randint(x, y)
  }
  return result
}


function sleep(ms:number):number{
	const start = Date.now();
	while (Date.now()-start<ms);
	return 0;
}