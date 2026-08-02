const std = @import("std");

test "test failure" {
    const b = false;
    try std.testing.expect(b);
}
