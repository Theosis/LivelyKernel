module('lively.ast.Rewriting').requires('lively.ast.Parser').toRun(function() {

Object.extend(lively.ast, {
    oldEval: eval
});

Object.subclass('lively.ast.Rewriting.AstTable', {
    initialize: function() {
        this.table = [];
    },
    register: function(funcAst) {
        this.table.push(funcAst);
        return this.table.length - 1;
    },
    wrapWithAstInitializer: function(originalFuncAst, newFuncAst) {
        var fn = new lively.ast.Variable(newFuncAst.pos, "__livelyAST");
        var num = new lively.ast.Number(newFuncAst.pos, this.register(originalFuncAst));
        var call = new lively.ast.Call(newFuncAst.pos, fn, [num, newFuncAst]);
        return call;
    }
});

Object.extend(lively.ast.Rewriting, {
    table: new lively.ast.Rewriting.AstTable()
});

lively.ast.Visitor.subclass('lively.ast.Rewriting.Transformation',
'helping', {
    visitNodes: function(nodes) {
        var result = [];
        for (var i = 0; i < nodes.length; i++) {
            var res = this.visit(nodes[i]);
            if (res) result.push(res);
        }
        return result;
    }
},
'visiting', {
    visitSequence: function(node) {
        return new lively.ast.Sequence(node.pos, this.visitNodes(node.children));
    },
    visitNumber: function(node) {
        return new lively.ast.Number(node.pos, node.value);
    },
    visitString: function(node) {
        return new lively.ast.String(node.pos, node.value);
    },
    visitCond: function(node) {
        return new lively.ast.Cond(node.pos,
                                   this.visit(node.condExpr),
                                   this.visit(node.trueExpr),
                                   this.visit(node.falseExpr));
    },
    visitIf: function(node) {
        return new lively.ast.If(node.pos,
                                 this.visit(node.condExpr),
                                 this.visit(node.trueExpr),
                                 this.visit(node.falseExpr));
    },
    visitWhile: function(node) {
        return new lively.ast.While(node.pos,
                                    this.visit(node.condExpr),
                                    this.visit(node.body));
    },
    visitDoWhile: function(node) {
        return new lively.ast.DoWhile(node.pos,
                                      this.visit(node.body),
                                      this.visit(node.condExpr));
    },
    visitFor: function(node) {
        return new lively.ast.For(node.pos,
                                  this.visit(node.init),
                                  this.visit(node.condExpr),
                                  this.visit(node.body),
                                  this.visit(node.upd));
    },
    visitForIn: function(node) {
        return new lively.ast.ForIn(node.pos,
                                    this.visit(node.name),
                                    this.visit(node.obj),
                                    this.visit(node.body));
    },
    visitSet: function(node) {
        return new lively.ast.Set(node.pos,
                                  this.visit(node.left),
                                  this.visit(node.right));
    },
    visitModifyingSet: function(node) {
        return new lively.ast.ModifyingSet(node.pos,
                                           this.visit(node.left),
                                           node.name,
                                           this.visit(node.right));
    },
    visitBinaryOp: function(node) {
        return new lively.ast.BinaryOp(node.pos,
                                       node.name,
                                       this.visit(node.left),
                                       this.visit(node.right));
    },
    visitUnaryOp: function(node) {
        return new lively.ast.UnaryOp(node.pos,
                                      node.name,
                                      this.visit(node.expr));
    },
    visitPreOp: function(node) {
        return new lively.ast.PreOp(node.pos,
                                    node.name,
                                    this.visit(node.expr));
    },
    visitPostOp: function(node) {
        return new lively.ast.PostOp(node.pos,
                                     node.name,
                                     this.visit(node.expr));
    },
    visitThis: function(node) {
        return new lively.ast.This(node.pos);
    },
    visitVariable: function(node) {
        return new lively.ast.Variable(node.pos, node.name);
    },
    visitGetSlot: function(node) {
        return new lively.ast.GetSlot(node.pos,
                                      this.visit(node.slotName),
                                      this.visit(node.obj));
    },
    visitBreak: function(node) {
        return new lively.ast.Break(node.pos);
    },
    visitDebugger: function(node) {
        return new lively.ast.Debugger(node.pos);
    },
    visitContinue: function(node) {
        return new lively.ast.Continue(node.pos);
    },
    visitArrayLiteral: function(node) {
        return new lively.ast.ArrayLiteral(node.pos, this.visitNodes(node.elements));
    },
    visitReturn: function(node) {
        return new lively.ast.Return(node.pos,this.visit(node.expr));
    },
    visitWith: function(node) {
        throw new Error('with statement not supported');
    },
    visitSend: function(node) {
        return new lively.ast.Send(node.pos,
                                   this.visit(node.property),
                                   this.visit(node.recv),
                                   this.visitNodes(node.args));
    },
    visitCall: function(node) {
        return new lively.ast.Call(node.pos,
                                   this.visit(node.fn),
                                   this.visitNodes(node.args));
    },
    visitNew: function(node) {
        return new lively.ast.New(node.pos, this.visit(node.clsExpr));
    },
    visitVarDeclaration: function(node) {
        return new lively.ast.VarDeclaration(node.pos, node.name, this.visit(node.val));
    },
    visitThrow: function(node) {
        return new lively.ast.Throw(node.pos, this.visit(node.expr));
    },
    visitTryCatchFinally: function(node) {
        return new lively.ast.TryCatchFinally(node.pos,
                                              this.visit(node.trySeq),
                                              node.err,
                                              this.visit(node.catchSeq),
                                              this.visit(node.finallySeq));
    },
    visitFunction: function(node) {
        return new lively.ast.Function(node.pos,
                                       this.visit(node.body),
                                       this.visitNodes(node.args));
    },
    visitObjectLiteral: function(node) {
        return new lively.ast.ObjectLiteral(node.pos, this.visitNodes(node.properties));
    },
    visitObjProperty: function(node) {
        return new lively.ast.ObjectProperty(node.pos, node.name, this.visit(node.property));
    },
    visitSwitch: function(node) {
        return new lively.ast.Switch(node.pos,
                                     this.visit(node.expr),
                                     this.visitNodes(node.cases));
    },
    visitCase: function(node) {
        return new lively.ast.Case(node.pos,
                                   this.visit(node.condExpr),
                                   this.visit(node.thenExpr));
    },
    visitDefault: function(node) {
        return new lively.ast.Case(node.pos, this.visit(node.defaultExpr));
    },
    visitRegex: function(node) {
        return new lively.ast.Regex(node.pos, node.exprString, node.flags);
    },
    visitObjPropertyGet: function(node) {
        return new lively.ast.ObjPropertyGet(node.pos, node.name, this.visit(node.body));
    },
    visitObjPropertySet: function(node) {
        return new lively.ast.ObjPropertySet(node.pos,
                                             node.name,
                                             this.visit(node.body),
                                             node.arg);
    }
});

lively.ast.Rewriting.Transformation.subclass('lively.ast.Rewriting.RemoveDebugger',
'visiting', {
    visitDebugger: function(node) {
        return undefined;
    }
});

lively.ast.Rewriting.Transformation.subclass('lively.ast.Rewriting.Rewriter',
'initializing', {
    initialize: function($super) {
        $super();
        this.scopes = [];
    }
},
'scoping', {
    enterScope: function() {
        this.scopes.push([]);
    },
    registerVar: function(name) {
        this.scopes.last().push(name);
    },
    referenceVar: function(name) {
        for (var i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].include(name)) return i;
        }
        return undefined;
    },
    exitScope: function() {
        this.scopes.pop();
    },
},
'helping', {
    computationFrame: function() {
        return new lively.ast.Variable([0,0], "_");
    },
    localFrame: function(i) {
        return new lively.ast.Variable([0,0], "_" + i);
    }
},
'rewriting', {
    wrapVar: function(pos, name) {
        var scope = this.referenceVar(name);
        if (scope === undefined) return new lively.ast.Variable(pos, name);
        return new lively.ast.GetSlot(pos,
                                      new lively.ast.String(pos, name),
                                      this.localFrame(scope));
    },
    rewriteVarDeclaration: function(pos, name, expr) {
        var scope = this.registerVar(name);
        return new lively.ast.Set(pos, this.wrapVar(pos, name), expr);
    },
    wrapFunctionBody: function(body) {
        return body;
    }
},
'visiting', {
    visitVarDeclaration: function(node) {
        this.registerVar(node.name.value);
        return this.rewriteVarDeclaration(node.pos, node.name, this.visit(node.val))
    },
    visitVariable: function(node) {
        return this.wrapVar(node.pos, node.name);
    },
    visitDebugger: function(node) {
        return undefined;
    },
    visitFunction: function($super, node) {
        this.enterScope();
        var rewritten = $super(node);
        this.exitScope();
        rewritten.body = this.wrapFunctionBody(rewritten.body);
        return lively.ast.Rewriting.table.wrapWithAstInitializer(node, rewritten);
    }
});

Object.extend(Global, {
    __livelyAST: function(i, scope, f) {
        f._cachedAst = lively.ast.Rewriting.table.table[i];
        f._cachedScope = scope;
        return f;
    },
    eval2: function(src) {
        var ast = lively.ast.Parser.parse(src, 'topLevel');
        var rewriter = new lively.ast.Rewriting.Rewriter();
        var rewrittenAst = rewriter.visit(ast);
        return lively.ast.oldEval(rewrittenAst.asJS())();
    }
});

Object.extend(JSLoader, {
    loadJs2: function (url, onLoadCb, loadSync, okToUseCache, cacheQuery) {
        var exactUrl = url;
        if ((exactUrl.indexOf('!svn') <= 0) && !okToUseCache) {
            exactUrl = this.makeUncached(exactUrl, cacheQuery);
        }
        $.ajax(exactUrl, {
            success: lively.ast.Rewriting.loadJS.bind(lively.ast.Rewriting, onLoadCb)
        });
    }
});

Object.extend(lively.ast.Rewriting, {
    loadJS: function(cb, src) {
        if (!src) { src = cb; cb = null; }
        eval(src);
        if (cb) cb();
    }
});

}) // end of module