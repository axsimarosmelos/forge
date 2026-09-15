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
