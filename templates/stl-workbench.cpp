#include <algorithm>
#include <deque>
#include <functional>
#include <iostream>
#include <map>
#include <numeric>
#include <queue>
#include <set>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>
int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);
    std::vector<int> a{8, 3, 8, 1};
    a.push_back(5);
    std::sort(a.begin(), a.end());
    auto lo = std::lower_bound(a.begin(), a.end(), 8);
    auto hi = std::upper_bound(a.begin(), a.end(), 8);
    std::cout << "eights " << hi - lo << '\n';
    std::cout << "sum " << std::accumulate(a.begin(), a.end(), 0LL) << '\n';
    std::map<int, int> frequency;
    for (int x : a) ++frequency[x];
    std::cout << "frequency " << frequency[8] << '\n';
    std::multiset<int> bag{2, 2, 5};
    auto it = bag.find(2);
    if (it != bag.end()) bag.erase(it);
    std::cout << "remaining twos " << bag.count(2) << '\n';
    std::unordered_map<std::string, int> count;
    count.max_load_factor(0.7f);
    count.reserve(16);
    ++count["idea"];
    std::cout << "ideas " << count["idea"] << '\n';
    std::priority_queue<int, std::vector<int>, std::greater<int>> heap;
    heap.push(9); heap.push(3);
    std::cout << "minimum " << heap.top() << '\n'; heap.pop();
    std::queue<int> q; q.push(7);
    std::cout << "first " << q.front() << '\n'; q.pop();
    std::vector<std::pair<int, int>> tasks{{3, 9}, {1, 9}, {2, 5}};
    std::sort(tasks.begin(), tasks.end(), [](const auto& x, const auto& y) {
        if (x.second != y.second) return x.second < y.second;
        return x.first < y.first;
    });
    std::cout << "first task " << tasks.front().first << '\n';
}
