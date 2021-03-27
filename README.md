# Javascript Nfa To Dfa

For using this codes [tekincancakal.github.io/Nfa-To-Dfa/](https://tekincancakal.github.io/Nfa-To-Dfa/)
![Example](https://raw.githubusercontent.com/TekincanCakal/Nfa-To-Dfa/main/Example.png?raw=true)
#Output Of Example Image

ε-Closure(q0) = {q0, q3} = A 
Process A({q0, q3})
      MoveDFA(A,0)=ε-Closure(MoveNFA(A,0)) = ε-Closure({q0, q3}) = {q0, q3} = undefined
      MoveDFA(A,1)=ε-Closure(MoveNFA(A,1)) = ε-Closure({q0, q3}) = {q1, q2} = B
      MoveDFA(A,\epsilon)=ε-Closure(MoveNFA(A,\epsilon)) = ε-Closure({q0, q3}) = {q3} = C

Process B({q1, q2})
      MoveDFA(B,0)=ε-Closure(MoveNFA(B,0)) = ε-Closure({q1, q2}) = {} = Ø
      MoveDFA(B,1)=ε-Closure(MoveNFA(B,1)) = ε-Closure({q1, q2}) = {q2} = D
      MoveDFA(B,\epsilon)=ε-Closure(MoveNFA(B,\epsilon)) = ε-Closure({q1, q2}) = {} = Ø

Process C({q3})
      MoveDFA(C,0)=ε-Closure(MoveNFA(C,0)) = ε-Closure({q3}) = {} = Ø
      MoveDFA(C,1)=ε-Closure(MoveNFA(C,1)) = ε-Closure({q3}) = {q2} = D
      MoveDFA(C,\epsilon)=ε-Closure(MoveNFA(C,\epsilon)) = ε-Closure({q3}) = {} = Ø

Process Ø({})
      MoveDFA(Ø,0)=ε-Closure(MoveNFA(Ø,0)) = ε-Closure({}) = {} = Ø
      MoveDFA(Ø,1)=ε-Closure(MoveNFA(Ø,1)) = ε-Closure({}) = {} = Ø
      MoveDFA(Ø,\epsilon)=ε-Closure(MoveNFA(Ø,\epsilon)) = ε-Closure({}) = {} = Ø

Process D({q2})
      MoveDFA(D,0)=ε-Closure(MoveNFA(D,0)) = ε-Closure({q2}) = {} = Ø
      MoveDFA(D,1)=ε-Closure(MoveNFA(D,1)) = ε-Closure({q2}) = {} = Ø
      MoveDFA(D,\epsilon)=ε-Closure(MoveNFA(D,\epsilon)) = ε-Closure({q2}) = {} = Ø

Final States = {A,B,C,D}
Connections
A->undefined=0
A->B=1
A->C=\epsilon
B->Ø=0
B->D=1
B->Ø=\epsilon
C->Ø=0
C->D=1
C->Ø=\epsilon
Ø->Ø=0
Ø->Ø=1
Ø->Ø=\epsilon
D->Ø=0
D->Ø=1
D->Ø=\epsilon
