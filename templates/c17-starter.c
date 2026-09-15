#include <stdio.h>
int main(void) {
    long long a, b;
    if (scanf("%lld %lld", &a, &b) != 2) return 0;
    printf("%lld\n", a + b); /* Assumes the sum fits in long long. */
    return 0;
}
