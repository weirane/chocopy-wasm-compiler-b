import { SourceLocation } from "./ast";
import { stackTrace } from "./runtime_error";

export class CompileTimeError extends Error {
    __proto__: Error
    constructor(message?: string) {
     const trueProto = new.target.prototype;
     super(message);
 
     // Alternatively use Object.setPrototypeOf if you have an ES6 environment.
     this.__proto__ = trueProto;
   } 
 }

// I ❤️ TypeScript: https://github.com/microsoft/TypeScript/issues/13965
export class TypeCheckError extends CompileTimeError {
    constructor(message?: string, location?: SourceLocation) {
     super("TYPE ERROR: " + message + " in line " + location.line.toString()+" at column " + location.column.toString() + "\n" + location.srcCode.trim());
   } 
 }

 export class ReferenceError extends CompileTimeError {
    constructor(message?: string) {
     super("REFERENCE ERROR: " + message);
   } 
 }

 export class ParseError extends CompileTimeError {
    __proto__: CompileTimeError 
    constructor(message?: string, location?: SourceLocation) {
     const trueProto = new.target.prototype;
     super("PARSE ERROR: " + message + " in line " + location.line.toString()+" at column " + location.column.toString() + "\n" + location.srcCode.trim());
     this.__proto__ = trueProto;
   } 
 }

 export class RunTimeError extends Error {
    __proto__: Error
    constructor(message?: string) {
     const trueProto = new.target.prototype;
     super(message);
 
     // Alternatively use Object.setPrototypeOf if you have an ES6 environment.
     this.__proto__ = trueProto;
   } 
 }

