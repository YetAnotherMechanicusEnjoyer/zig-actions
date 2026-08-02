const std = @import("std");

pub const Type = @This();

pub fn init() Type {
    return Type;
}

fn another_method() usize {
    return 15 + 12;
}

pub fn method(self: Type) usize {
    return self.another_method;
}
