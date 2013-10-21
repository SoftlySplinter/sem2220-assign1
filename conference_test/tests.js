test( "Controller", function() {
  notEqual(Conference, null, "Controller should not be null.");
  Conference.renderSessionsList;
});

test("DataContext", function() {
  notEqual(Conference.dataContext, null, "Data Context should not be null");
  ok(1, 1);
});
