/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const chai = require("chai");
const should = chai.should();

const PromiseBar = require("../PromiseBar");

const delay = t => new Promise(resolve => setTimeout(resolve, t));

describe("PromiseBar.all works like Promise.all", function() {

  it("resolves", () => Promise.all([
    PromiseBar.all([delay(100)]),
    Promise.all([delay(100)])
  ]));

  return it("works with different data types", () => PromiseBar.all([
    10,
    delay(100)
  ]));
});
