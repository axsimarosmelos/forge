"""Original compact task restatements and new examples for the first study sets.
These briefs are not full platform statements and do not reproduce platform examples.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=[
('lc-1','Given a list of integers and a target, return the indices of two different entries whose values add to the target. The task promises one valid pair.','nums = [4, 9, 2], target = 11','[1, 2]','Indices refer to positions, not the values themselves.'),
('lc-217','Decide whether an integer list contains any value more than once.','nums = [8, 3, 8]','true','The repeated values can be far apart.'),
('lc-242','Decide whether two lowercase strings contain exactly the same letters with the same multiplicities.','s = "dusty", t = "study"','true','Equal sets of letters are insufficient; compare counts.'),
('lc-2235','Return the sum of the two supplied integers.','num1 = -6, num2 = 14','8','Return the value from the required function.'),
('lc-1480','For each position in an integer list, compute the sum from the beginning through that position.','nums = [3, -1, 5]','[3, 2, 7]','The current total is the previous total plus the new element.'),
('lc-1672','Each row of a matrix lists one person’s account balances. Return the largest row sum.','accounts = [[3, 4], [2, 8], [6, 1]]','10','Compare totals rather than individual cells.'),
('lc-1929','Return a list made by placing a copy of the input list immediately after the original.','nums = [7, 2]','[7, 2, 7, 2]','Preserve order in both copies.'),
('lc-1920','For a zero-based permutation nums, build an output where output[i] equals nums[nums[i]].','nums = [1, 2, 0]','[2, 0, 1]','Trace the inner index before reading the outer value.'),
('lc-412','Build the strings for integers 1 through n: use Fizz for multiples of 3, Buzz for multiples of 5, and FizzBuzz for multiples of both; otherwise use the number.','n = 5','["1", "2", "Fizz", "4", "Buzz"]','Check the combined condition before either individual condition.'),
('lc-1281','For a positive integer, return its digit product minus its digit sum.','n = 312','0','A zero digit makes the product zero.'),
('lc-704','Find a target in a sorted integer array. Return its index, or -1 if absent.','nums = [-4, 1, 6, 12], target = 6','2','Maintain a search interval that can still contain the answer.'),
('lc-35','In a strictly increasing integer array, return the target’s position, or the position where inserting it would preserve sorted order.','nums = [2, 5, 9], target = 7','2','The answer can equal the array length.'),
('lc-121','Choose one day to buy and a later day to sell. Return the greatest possible nonnegative profit.','prices = [9, 4, 7, 2, 8]','6','The buy must happen before the sell.'),
('lc-20','Check whether a string of round, square and curly brackets closes every opener in the correct nesting order.','s = "{[()]}"','true','Equal counts do not guarantee correct nesting.'),
('lc-206','Reverse a singly linked list and return its new head.','head = 4 → 8 → 1','1 → 8 → 4','Preserve the next pointer before redirecting a link.'),
('lc-21','Merge two sorted linked lists into a sorted result by connecting their nodes.','a = 1 → 7, b = 3 → 5','1 → 3 → 5 → 7','The smaller current head is the next safe choice.'),
('lc-70','Count how many ordered sequences of one-step and two-step moves reach stair n.','n = 4','5','Count move sequences, not just the number of two-step moves.'),
('lc-198','Choose a subset of nonadjacent houses to maximize the sum of their values.','values = [3, 8, 4, 9]','17','For each position compare taking it with skipping it.'),
('lc-322','Using unlimited coins of the given denominations, find the fewest coins that sum to an amount, or -1 if no combination works.','coins = [1, 4, 6], amount = 8','2','Taking the largest coin first need not be optimal.'),
('lc-200','Count connected groups of land cells in a grid. Land connects vertically or horizontally; diagonals do not connect.','grid = ["110", "010", "001"]','2','Mark a cell when adding it to your traversal to avoid duplicate work.'),
('lc-733','Starting at one image cell, recolor all four-directionally connected cells with its original color.','image = [[2,2],[2,3]], start = (0,0), color = 7','[[7,7],[7,3]]','If the new color equals the old color, stop immediately.'),
('lc-104','Return the maximum number of nodes on a path from a binary tree’s root to a leaf.','root 6 has child 2, which has child 9','3','An empty tree has depth zero.'),
('cf-4-A','Decide whether an integer weight can be split into two strictly positive even integer weights.','weight = 10','YES','Both pieces must be positive; test weight 2 separately.'),
('cf-71-A','For each word, leave it unchanged if it has at most ten characters. Otherwise output its first letter, the count of interior letters, and its last letter.','word = "characterization"','c14n','The threshold uses the full word length.'),
('cf-231-A','Each row contains three binary decisions. Count rows where at least two decisions are 1.','rows = [[1,0,1], [0,1,0], [1,1,1]]','2','Sum the three values in each row.'),
('cf-50-A','Find the maximum number of nonoverlapping 2-cell dominoes that fit on an m-by-n rectangular board.','m = 3, n = 5','7','An odd total cell count leaves one cell uncovered.'),
('cf-282-A','Start an integer at zero and process statements that increment or decrement it once. Return the final integer.','statements = ["++X", "X--", "X++"]','1','Prefix versus postfix does not change this task’s final value.'),
('cf-1-A','Cover a rectangular area with square tiles of a fixed side length. Tiles may extend beyond its border. Find the minimum number of tiles.','height = 7, width = 10, side = 4','6','Round up each dimension independently and use a wide product.'),
('at-abc086_a','Read two integers and report whether their product is odd or even.','a = 5, b = 8','Even','A product is odd exactly when both factors are odd.'),
('at-abc081_a','Count how many of the three supplied binary characters are 1.','bits = "101"','2','Characters and integer values are different types.'),
('at-abc081_b','Repeatedly divide every number in the list by two while all numbers are even. Count how many complete rounds are possible.','values = [12, 20, 28]','2','The first number that becomes odd stops the whole process.'),
('at-abc087_b','Count combinations of available 500-, 100- and 50-value coins that total a target. Coins of the same value are indistinguishable.','available = [1, 2, 3], target = 200','2','Enumerate quantities within their available limits.'),
('at-abc083_b','Among integers from 1 to n, sum those whose decimal digit sum lies in the inclusive interval [a,b].','n = 12, a = 3, b = 3','15','Test the digit sum, then add the original number.'),
('at-abc088_b','Two players alternate taking one remaining number. Both maximize their own final total. Return the first player’s total minus the second player’s total.','values = [9, 2, 6, 1]','4','Sort in descending order and alternate ownership.'),
('at-abc085_b','Each item has a size. Find the maximum length of a stack whose sizes strictly decrease from bottom to top.','sizes = [8, 5, 8, 3]','3','Only distinct sizes contribute another level.'),
('at-abc085_c','Given a count of banknotes and a total value, find counts of 10000-, 5000- and 1000-value notes meeting both conditions, or report impossibility.','note count = 3, total = 16000','1 1 1','Derive the third count after choosing the first two.'),
('at-abc086_c','A traveler starts at the origin at time zero and must visit specified grid positions at specified times, moving one unit horizontally or vertically each time unit. Decide whether the schedule is possible.','visits = [(3,1,2), (5,2,2)]','No','Check both Manhattan distance and the parity of extra time.')
]
items={id:{'summary':summary,'exampleInput':inp,'exampleOutput':out,'prompt':prompt,'authorship':'Original Forge study brief with an original example. This is a compact restatement, not the full official statement or its limits.'} for id,summary,inp,out,prompt in rows}
(ROOT/'content/problem-briefs.json').write_text(json.dumps(items,ensure_ascii=False,indent=2))
print('Original briefs:',len(items))
