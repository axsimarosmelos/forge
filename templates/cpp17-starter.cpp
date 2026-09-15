#include <iostream>
using i64 = long long;
void solve() {
    i64 a, b;
    if (!(std::cin >> a >> b)) return;
    std::cout << a + b << '\n'; // Assumes the sum fits in i64.
}
int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    solve(); // Read a test-case count only if the statement specifies one.
}
