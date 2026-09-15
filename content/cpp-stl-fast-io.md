# C++ STL for Competitive Programming & Fast I/O

**Language:** C++17 · **Track:** C++ foundations · **Suggested study:** two or three focused sessions

**Prerequisites:** variables and types, conditions, loops, functions, references, and Big-O notation. If any of these are unfamiliar, use the C++ foundation lessons first. You do not need to learn C before C++.

**Outcome:** read contest input reliably, select a suitable standard container, sort and search correctly, and explain both the cost and the failure cases of your solution.

This is original teaching material and independently written code. The advanced topic map draws inspiration from cp-algorithms; this lesson does not reproduce its articles.

## 1. Your first contest program

A C++ program is compiled before it runs. Headers declare library facilities, `main` is the entry point, braces delimit blocks, and most statements end with a semicolon. `std::` names a facility in the standard library. Compilation errors and errors that happen while a valid program runs are different stages.

```cpp
#include <iostream>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    long long a, b;
    if (!(std::cin >> a >> b)) return 0;
    std::cout << a + b << '\n';
}
```

With input `7 12`, the output is `19`. `>>` reads whitespace-separated values: a space or a newline between them works. `<<` writes output. The input check exits cleanly if the required values are absent. This example assumes the sum fits in `long long`.

Do not add `Enter a number:` prompts to a judged program. Read the statement to determine whether a test-case count exists. If it does, read it and call a `solve()` function once per case; otherwise, call `solve()` once.

### What the two I/O lines actually do

`sync_with_stdio(false)` permits the C++ streams to operate independently of the C standard streams. Call it before doing any input or output. After disabling synchronization, avoid mixing `cin`/`cout` with `scanf`/`printf` in the same program. This is a practical performance choice, not a universal guarantee that all input becomes fast enough.

By default, reading from `cin` can flush its tied output stream. `cin.tie(nullptr)` removes that tie. For ordinary batch problems, unnecessary flushing wastes work. For an **interactive** problem, explicitly flush each query before waiting for the judge: `std::cout << query << std::endl;` or `std::cout << query << '\n' << std::flush;`.

`'\n'` writes a newline. `std::endl` writes a newline **and flushes**. Prefer `'\n'` for ordinary output. Do not remove flushing from an interactive protocol simply because a template says to.

For full lines, use `std::getline(std::cin, line)`. If a preceding `>>` left a newline pending, consume it deliberately, for example with `std::getline(std::cin >> std::ws, line)`. `std::ws` also removes leading whitespace, so do not use it if those leading spaces are meaningful.

**Predict:** If a program reads two integers with `cin >> a >> b`, does putting them on separate lines change the sum? No: both extractions skip ordinary leading whitespace.

The shorter examples below are fragments: put headers at the top of your file, helper functions outside `main`, and executable statements inside `main` or `solve`. The downloadable STL workbench combines the container examples into one complete program.

## 2. Types, overflow, and useful aliases

`int` is commonly 32 bits on contest platforms, but C++ only specifies minimum ranges. Use `long long` for sums that may exceed a 32-bit signed range. A wider destination does not retroactively widen an earlier expression:

```cpp
int a = 100000, b = 100000;
long long product = 1LL * a * b; // multiplication now occurs in long long
```

Signed overflow is undefined behavior. Even `long long` is finite. Bound the largest intermediate value, not only the final answer. If you need fixed-width types, use `<cstdint>` and `std::int64_t` when supported. GNU's `__int128` is a useful nonstandard extension on some contest compilers; check the permitted compiler before relying on it.

Prefer aliases, constants, and functions over macros:

```cpp
using i64 = long long;
constexpr i64 MOD = 1'000'000'007LL;

bool improve_min(i64& best, i64 candidate) {
    if (candidate < best) { best = candidate; return true; }
    return false;
}
```

The `&` parameter lets the function update the caller's variable. Avoid `#define int long long`: it rewrites unrelated declarations and hides the types you are trying to reason about. A macro such as `#define SQUARE(x) ((x)*(x))` evaluates its argument twice; `SQUARE(i++)` is a trap. Use a function. `#define ALL(v) (v).begin(), (v).end()` is seen in contest code, but explicit iterators are clearer while learning; do not pass a side-effecting expression to it.

`<bits/stdc++.h>` is a GNU convenience header, not a standard C++ header. The downloadable templates use explicit headers and C++17 features.

## 3. `vector`: the default sequence

Think of `std::vector<T>` as a resizable contiguous array. It provides constant-time indexing, amortized constant-time append, and a size that you can inspect.

```cpp
#include <vector>
#include <algorithm>
#include <iostream>

std::vector<int> values{8, 3, 8, 1};
values.push_back(5);
std::sort(values.begin(), values.end());
for (const int x : values) std::cout << x << ' ';
std::cout << '\n'; // 1 3 5 8 8
```

A range-for loop visits values. `const auto& x` avoids copying a large element while preventing changes. `auto& x` permits updates. `auto x` makes a copy. For an `int`, copying is usually exactly what you want.

`std::vector<int> a(n)` creates **n elements** initialized to zero. `a.reserve(n)` only reserves capacity; it does not create elements. Writing `a[0]` after reserving an empty vector is invalid. Use `push_back` or resize first.

`a[i]` does not check its bounds. In a debug experiment, `a.at(i)` can help catch an out-of-range access. Appending may reallocate the vector and invalidate pointers, references, and iterators into it. Do not keep such a handle across an operation that can invalidate it.

Removing duplicates after sorting is a two-step operation:

```cpp
std::sort(values.begin(), values.end());
values.erase(std::unique(values.begin(), values.end()), values.end());
```

`unique` compacts adjacent distinct values and returns a new logical end. `erase` actually shrinks the vector. This deliberately loses multiplicity; do not apply it when frequencies matter.

## 4. Sorting and strict comparators

`std::sort` needs random-access iterators and makes O(n log n) comparisons. The default order is ascending. Pairs are ordered lexicographically: first component first, then second.

```cpp
#include <algorithm>
#include <utility>
#include <vector>

std::vector<std::pair<int, int>> tasks{{3, 9}, {1, 9}, {2, 5}};
std::sort(tasks.begin(), tasks.end(), [](const auto& a, const auto& b) {
    if (a.second != b.second) return a.second < b.second;
    return a.first < b.first;
});
// (2,5), (1,9), (3,9): second value first, then first value
```

A sorting comparator must define a strict weak ordering. At minimum, an item must not compare less than itself. Using `<=` violates that rule. Prefer `a.score < b.score` to subtracting scores and comparing with zero; subtraction itself can overflow.

`std::sort` is not stable. If preserving the original order among equivalent keys matters, choose `std::stable_sort` or make the original position an explicit tie-breaker. Sorting can also destroy the input order needed by a problem; preserve indices when necessary.

## 5. Binary search without off-by-one guesses

Binary search requires data ordered consistently with the search comparison. For an ascending vector:

```cpp
std::vector<int> a{2, 4, 4, 9};
auto lo = std::lower_bound(a.begin(), a.end(), 4);
auto hi = std::upper_bound(a.begin(), a.end(), 4);
long long count = hi - lo; // 2
bool exists = lo != a.end() && *lo == 4;
```

`lower_bound` finds the first element at least the target. `upper_bound` finds the first strictly greater element. On a vector, each search uses O(log n) comparisons and iterator movement. Subtracting the two iterators gives the number of occurrences.

The result can equal `end()`. That is a position after the last element, not an element you may dereference. Check before using `*it`. Search ranges follow `[first, last)`: include the first position and exclude the last.

Do not use the generic `std::lower_bound(set.begin(), set.end(), x)` expecting logarithmic traversal: set iterators are not random-access, and iterator advancement may be linear. Use the container's `set.lower_bound(x)` member instead.

## 6. Ordered sets and maps

`std::set<T>` stores unique ordered keys. `std::multiset<T>` permits duplicate keys. `std::map<Key, Value>` stores one associated value per ordered key. The standard specifies logarithmic complexity for their usual search and insertion operations; you do not need to depend on a particular tree implementation.

```cpp
#include <map>
#include <set>
#include <vector>

std::map<int, int> frequency;
for (int x : std::vector<int>{5, 2, 5}) ++frequency[x];
// frequency[2] is 1; frequency[5] is 2

std::set<int> available{2, 5, 8};
auto it = available.lower_bound(4); // points to 5
if (it != available.end()) available.erase(it);
```

`frequency[x]` inserts a zero-initialized mapped value if x is absent. That is convenient for counting but surprising for a read-only membership test. Use `find` to avoid insertion. `contains` is a C++20 facility, so these C++17 templates use `find(...) != end()`.

For a multiset, `erase(value)` erases **all** equal elements. To remove one occurrence, find an iterator and erase that iterator. Never erase `end()`.

## 7. Hash containers: average speed, different guarantees

`std::unordered_map` and `std::unordered_set` support average O(1) lookup and insertion under the usual hash assumptions. Individual operations can degrade to O(n). They provide neither sorted iteration nor ordered lower bounds.

```cpp
#include <unordered_map>

std::unordered_map<int, int> frequency;
frequency.max_load_factor(0.7f);
frequency.reserve(200000);
++frequency[42];
```

Reserving can reduce rehashing, and a lower maximum load factor trades memory for fewer average collisions. Neither change guarantees protection from adversarial collisions. When worst-case predictability matters, consider an ordered map, sorting, or coordinate compression. Do not call a hash-based method unconditionally O(n) overall without mentioning its assumptions.

A rehash invalidates iterators. Avoid keeping an iterator across insertions that might rehash. Ask which operations the task needs before deciding that a hash container is automatically the fastest choice.

## 8. Stack, queue, deque, and priority queue

Use a stack for the most recently unfinished item, a queue for the oldest waiting item, and a deque when both ends matter. A vector with `push_back`, `back`, and `pop_back` is often a convenient stack.

```cpp
#include <queue>
#include <deque>
#include <functional>
#include <vector>

std::queue<int> q;
q.push(3);
int first = q.front();
q.pop(); // pop returns void; it does not return the removed value

std::deque<int> dq;
dq.push_back(4);
dq.push_front(2);

std::priority_queue<int> largest_first;
std::priority_queue<int, std::vector<int>, std::greater<int>> smallest_first;
smallest_first.push(9);
smallest_first.push(3);
int minimum = smallest_first.top(); // 3
smallest_first.pop();
```

Check `empty()` before `front`, `back`, `top`, or removal. A priority queue provides O(1) access to its top and O(log n) insertion/removal. It does not directly remove arbitrary elements or decrease a stored key. In Dijkstra's algorithm, a common alternative is to push a new `(distance, vertex)` pair and discard stale pairs when popped.

A default priority queue is a **max-heap**. Accidentally using it for a smallest-distance-first algorithm is a common contest bug. Pairs in a priority queue still follow lexicographic comparison.

## 9. A small algorithm toolbox

```cpp
#include <algorithm>
#include <numeric>
#include <vector>

std::vector<int> a{4, 1, 7};
long long sum = std::accumulate(a.begin(), a.end(), 0LL);
int maximum = *std::max_element(a.begin(), a.end()); // a must be nonempty
std::reverse(a.begin(), a.end());
std::vector<int> ids(3);
std::iota(ids.begin(), ids.end(), 0); // 0, 1, 2
```

The third argument to `accumulate` determines the accumulator type. `0` gives an `int` accumulator; `0LL` gives `long long`. A final assignment to `long long` does not repair an overflow that already happened in an `int` accumulator.

For coordinate compression, copy the values, sort the copy, remove duplicates, and use a lower-bound index as the compressed coordinate. Compression preserves order and equality, not numeric distances. Two adjacent compressed indices may represent values very far apart.

## 10. Choose by required operations

| Need | Useful choice | Key cost or caveat |
| --- | --- | --- |
| Indexed sequence | vector | O(1) indexing; amortized O(1) append |
| Static ordered queries | sorted vector | O(n log n) build; O(log n) binary search |
| Dynamic ordered unique keys | set | O(log n) insert/find/lower_bound |
| Dynamic ordered key/value data | map | O(log n); `[]` may insert |
| Presence/frequency without order | unordered_set / unordered_map | average O(1), worst-case O(n) per operation |
| Duplicate ordered keys | multiset | O(log n) search; erase-by-key removes all matches |
| Last-in-first-out | vector as stack / stack | O(1) pop; amortized O(1) vector push |
| First-in-first-out | queue | O(1) with its default deque backing |
| Both ends | deque | O(1) end insertion/removal |
| Repeated next minimum/maximum | priority_queue | O(1) top, O(log n) push/pop |

Complexity describes growth; constants, allocation, cache locality, and data sizes still matter. Start with the simplest data structure that meets the constraints and makes the invariant easy to state.

## 11. Original practice problem: Scoreboard Thresholds

A training club has n recorded scores. Each query gives a threshold x. For every query, report:

1. the number of recorded scores greater than or equal to x, counting duplicates;
2. the smallest recorded score greater than or equal to x, or -1 if none exists.

The scores never change between queries.

**Input:** the first line contains n and q. The next line contains n scores. Each of the following q lines contains one threshold x.

**Constraints:** 1 ≤ n, q ≤ 200,000. Scores and thresholds are integers from 0 through 1,000,000,000.

**Output:** one line per query, containing the count and the smallest qualifying score, separated by a space.

```text
Input
5 4
10 20 20 40 50
20
21
51
0

Output
4 20
2 40
0 -1
5 10
```

For threshold 20, both occurrences of 20 count, as do 40 and 50. For threshold 51 there is no qualifying score.

### Try before looking at the method

- What changes if a query equals a duplicated score?
- How much work would scanning all n scores for each of q queries require?
- Which fact about the data allows you to preprocess only once?

### Hint ladder

**Hint 1:** Sorting groups all qualifying scores into a suffix.

**Hint 2:** The first element of that suffix is the lower bound of x, not the upper bound.

**Hint 3:** If its index is k, the suffix contains n - k elements. Handle k == n before dereferencing.

### Method and correctness

Sort all scores in nondecreasing order. For each threshold, find its lower bound. By definition, every earlier score is less than x. Every score at or after that iterator is at least x, so exactly those scores qualify. Their number is the suffix length. If the suffix is nonempty, its first value is its minimum. If empty, output `0 -1`.

Preprocessing takes O(n log n) time. Each query takes O(log n), for total O(n log n + q log n). The vector stores O(n) values. Duplicate scores must remain in the vector because the task counts occurrences.

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    int n, q;
    if (!(std::cin >> n >> q)) return 0;
    std::vector<long long> scores(n);
    for (auto& value : scores) std::cin >> value;
    std::sort(scores.begin(), scores.end());

    while (q--) {
        long long x;
        std::cin >> x;
        auto it = std::lower_bound(scores.begin(), scores.end(), x);
        auto count = scores.end() - it;
        long long smallest = it == scores.end() ? -1 : *it;
        std::cout << count << ' ' << smallest << '\n';
    }
}
```

### Test deliberately

- n = 1; threshold smaller than, equal to, and larger than the one score.
- All scores equal; the threshold equals that repeated value.
- Scores already sorted, reverse sorted, and containing zero.
- Every query above the maximum, then every query below the minimum.
- Large n and q to expose an O(nq) implementation.

**Transfer exercise:** Change the question to count scores strictly greater than x. Explain why `upper_bound` replaces `lower_bound`. Then extend each query to count scores in an inclusive range [L, R]. Derive the two bounds before coding.

## 12. Retrieve, then revisit

Close the lesson and answer these from memory:

1. What do the two fast-I/O setup lines change? When must you flush anyway?
2. How are vector size and capacity different?
3. What is the contract difference between lower_bound and upper_bound?
4. What happens when you use `map[key]` for a missing key?
5. Why is `<=` not an acceptable sort comparator?
6. Why does `accumulate(..., 0LL)` matter?
7. When would sorting or map be preferable to unordered_map?
8. How do you construct a min-priority queue in C++17?

Today: write the practice solution without copying. Tomorrow: reconstruct it from a blank file. Several days later: do the strictly-greater and interval-count variants. Use your recall ratings to adjust these intervals; copying a remembered template is not a substitute for explaining its invariant and testing a new statement.

## References and downloadable templates

- [C++ draft: synchronization of standard streams](https://eel.is/c++draft/ios.members.static)
- [C++ draft: vector](https://eel.is/c++draft/vector)
- [C++ draft: associative containers](https://eel.is/c++draft/associative.reqmts)
- [C++ draft: binary-search algorithms](https://eel.is/c++draft/alg.binary.search)
- [cp-algorithms topic reference](https://cp-algorithms.com/)
- [cpp17-starter.cpp](../templates/cpp17-starter.cpp): minimal contest structure.
- [stl-workbench.cpp](../templates/stl-workbench.cpp): an executable collection of container examples.
- [scoreboard-thresholds.cpp](../templates/scoreboard-thresholds.cpp): the complete original practice solution.
