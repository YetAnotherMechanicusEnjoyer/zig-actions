const std = @import("std");

test "test successful" {
    const b = true;
    try std.testing.expect(b);
}
