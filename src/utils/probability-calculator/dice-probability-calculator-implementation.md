use pure typescript for implementation
write code documentation first, then - write tests, then - code
run tests to ensure that everything works fine

for DSL implementation use chevrotain library (https://github.com/chevrotain/chevrotain)

be modular, implement core first, then add functionality via modules implementation

keep in mind, that as result we should have library that implements spec without any CLI or UI implementation

use TDD approach: firstly - implement types and interfaces in typescript, then write tests

do not implement actual functionality, just empty methods

for now tests will fail, so it's ok

at the end - create message.md file and write instructions for next session that will allow you to continue your work 
