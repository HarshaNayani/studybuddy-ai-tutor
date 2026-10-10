# Recursion in Python

Recursion is when a function calls itself to solve a smaller version of the same problem.

## Two parts
Every recursive function needs a base case that stops the recursion, and a recursive case that moves toward the base case.

## Example: factorial
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

factorial(4) becomes 4 * 3 * 2 * 1 = 24.

## Pitfalls
Missing base case causes infinite recursion and a RecursionError (Python's default limit is about 1000 calls). Naive recursive Fibonacci repeats work; use memoization with functools.lru_cache to speed it up.
