/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const pathval = require("pathval");
const stripAnsi = require("strip-ansi");

/*
An individual item to be used with PromiseBar.
*/
var Progress = (function() {
  let get = undefined;
  let set = undefined;
  Progress = class Progress {
    static initClass() {
  
      get = props => (() => {
        const result = [];
        for (let name in props) {
          const getter = props[name];
          result.push(this.prototype.__defineGetter__(name, getter));
        }
        return result;
      })();
      set = props => (() => {
        const result = [];
        for (let name in props) {
          const setter = props[name];
          result.push(this.prototype.__defineSetter__(name, setter));
        }
        return result;
      })();
  
      /*
      @property {Number} the count of completed items
      */
      this.prototype.done = 0;
  
      /*
      @property {Progress} set to another progress bar if this element appears under another element.
      */
      this.prototype.parent = null;
  
      /*
      @property {String} the proper number of spaces to indent progress bars that are in a hierarchy.
      */
      get({indent() {
        if (!this.parent) { return ""; }
        return this.parent.indent + this.opt("indent");
      }
  
      /*
      @property {String} a label for this progress bar.
      */
      });
      get({rawLabel() { return stripAnsi(this.opt("label")); }
  
      /*
      @property {String} a label for this progress bar, optionally padded to make all labels the same length.
      */
      });
      get({label() {
        const label = this.opt("label");
        if (!this.opt("pad") && !this.opt("padDeep")) { return label; }
        let max = 0;
        if (this.opt("padDeep")) {
          max = this._deep_max_length;
        } else if (this.parent) {
          max = this.parent.maxLabelLength();
        } else {
          max = this.bar.maxLabelLength();
        }
        return label + " ".repeat(max - this.rawLabel.length - this.indent.length);
      }
  
      /*
      @property {Number} the total number of items.
      */
      });
      get({total() { return this.items.length; }
  
      /*
      @property {String} the percent of completed items.
      */
      });
      get({percent() {
        const val = this.total > 0 ? (100 * (this.done / this.total)) : 0;
        return val.toPrecision(this.opt("percentLength"));
      }
  
      /*
      Find a configuration option by path.
      @param {String} k the path to a configuration option e.g. "categories[1].name"
      @return {Any} the value requested.
      */
      });
  
      /*
      @property {Array<Progress>} the children progress bars that are descendants of this one.
      */
      get({children() { return (Array.from(this.items).filter((bar) => bar.PromiseBar && bar.PromiseBar instanceof Progress).map((bar) => bar.PromiseBar)); }
  
      /*
      The number of lines needed to draw this progress bar.
      @return {Number}
      */
      });
    }

    /*
    @param {PromiseBar} bar the parent {PromiseBar}
    @param {Array<Any>} items the items that make up this progress bar.
    @param {Object} _opts options to configure the display of this progress bar.  See `opts` in {PromiseBar#all}.
    */
    constructor(bar1, items, _opts) {
      this.bar = bar1;
      this.items = items;
      this._opts = _opts;
      for (let item of Array.from(this.items)) {
        Promise.resolve(item).then(() => this.tick());
        if (this.opt("flat")) { continue; }
        if ((item.PromiseBar != null) && item.PromiseBar instanceof Progress) {
          item.PromiseBar.parent = this;
          item.PromiseBar.unregister();
        }
      }
    }

    /*
    Called when one of the Promise items is resolved.
    */
    tick() {
      this.bar.clear();
      ++this.done;
      return this.bar.draw();
    }
    opt(k) {
      if (pathval.hasProperty(this._opts, k)) { return pathval.getPathValue(this._opts, k); } else { return pathval.getPathValue(this.bar.conf, k); }
    }
    lines() {
      let lines = 1;
      if (this.opt("flat")) { return lines; }
      for (let bar of Array.from(this.children)) {
        lines += bar.lines();
      }
      return lines;
    }

    /*
    Draws this progress bar to the console.
    @return {String} the formatted progress bar
    */
    progressBar() {
      const fn = this.opt("format");
      const fmt = fn.apply(this, []);
      if (fmt.indexOf(":bar") === -1) { return fmt; }
      const barLength = process.stdout.columns - stripAnsi(fmt.replace(':bar', '')).length;
      const filled = this.total > 0 ? Math.floor(barLength * (this.done / this.total)) : 0;
      const fill = this.opt("filled")[0].repeat(filled);
      const unfilled = this.opt("empty")[0].repeat(barLength - filled);
      const barFormat = this.opt("barFormat");
      return console.log(fmt.replace(':bar', barFormat(`${fill}${unfilled}`)));
    }


    /*
    Determine the maximum label length for progress bars.
    @param {Boolean} deep if `true`, check nested progress bars.  Defaults to `false`.
    @return {Number} the length of the longest label.
    */
    maxLabelLength(deep) {
      if (deep == null) { deep = false; }
      let max = 0;
      for (let item of Array.from(this.children)) {
        if (item.rawLabel) { max = Math.max((item.indent.length + item.rawLabel.length), max); }
        if (deep) { max = Math.max(item.maxLabelLength(true), max); }
      }
      return max;
    }

    /*
    Draws this progress bar, including any other progress bars that are under this one in the hierarchy.
    @param {Number} deep the maximum label length of any label
    */
    draw(deep) {
      this._deep_max_length = deep;
      this.progressBar();
      if (this.opt("flat")) { return; }
      return Array.from(this.children).map((bar) =>
        bar.draw(deep));
    }

    unregister() {
      return this.bar.items.splice(this.bar.items.indexOf(this), 1);
    }
  };
  Progress.initClass();
  return Progress;
})();

/*
PromiseBar extends `Promise.all()` to display a progress bar representing the state of each item.

Keeps progress bars under all other stdout messages.
When drawing progress bars, a line is left under previous stdout messages, then progress bars are drawn.

```
Listening to 8080.    # Previous stdout message
                      * Empty line
Build: |----------|   # Progress bars
```

The cursor is then moved to the empty line.
When other messages are printed to stdout, they are written to the empty line, leaving the cursor on the first character
of the progress bars.

```
Listening to 8080.
New client connection.
Build: |----------|
```

stdout writes are listened to.  {PromiseBar#clear} is called, which empties all lines of the progress bar.

```
Listening to 8080.
New client connection.

```

The progress bars are then drawn again, with another empty line left for more `process.stdout` messages.

```
Listening to 8080.
New client connection.

Build: |----------|
```
*/
class PromiseBar {
  static initClass() {
  
    this.prototype.Progress = Progress;
  
    /*
    @property {Object} Default options to configure how progress bars are displayed.  See `opts` in  {PromiseBar#all} for
    the properties that can be set.
    */
    this.prototype.conf = null;
  
    /*
    @property {Boolean} `true` if PromiseBar is in charge of stdout.
    */
    this.prototype.enabled = false;
  
    /*
    @property {Boolean} `true` if PromiseBar has been stopped, and shouldn't be involved in output anymore.
    */
    this.prototype.ended = false;
  
    /*
    @property {Boolean} `true` if PromiseBar is internally controlling `process.stdout`.
    */
    this.prototype.processing = false;
  }

  constructor() {
    this.conf = {
      flat: false,
      label: "",
      filled: "▇",
      empty: "-",
      indent: "  ",
      pad: true,
      padDeep: false,
      format() {
        return `${this.indent}${this.label} [:bar] ${this.done}/${this.total} ${this.percent}%`;
      },
      barFormat(bar) { return bar; },
      percentLength: 3
    };
  }

  /*
  `Promise.all` replacement.
  @param {Array<Any>} items an array of items, same as `Promise.all()`
  @param {Object} opts options to configure the display of the progress bar.  Defaults are set in {ProgressBar#opts}.
  @option opts {String} label text to include in the progress bar.
  @option opts {Boolean} flat if `true`, progress bars won't indent under each other.  Defaults to `false`.
  @option opts {Boolean} pad if `true`, labels on progress bars at the same depth are padded to be an equal length.
    Defaults to `true`.
  @option opts {Boolean} padDeep if `true`, all labels on progress bars are padded to be an equal length.  Defaults to
    `false`.
  @option opts {String} filled a character to use for the solid progress bar.  Defaults to `"▇"`.
  @option opts {String} empty a character to use for unfilled progress.  Defaults to `"-"`.
  @option opts {String} indent characters inserted before progress bars to show hierarchy.  Defaults to `"  "`.
  @option opts {Function} format a function that returns the string of the progress bar.  See variables in {Progress} to
    insert.  `":bar"` will be replaced with a progress bar filling the available space.
  @option opts {Function} barFormat a function that transforms the progress bar.  Could be used to color the progress
    bar: `barFormat: (bar) => chalk.blue(bar)`.
  @option opts {Number} percentLength the number of digits to include for percentages.  Should be above `3`.
  */
  all(items, opts) {
    if (opts == null) { opts = {}; }
    if (!this.enabled) { return Promise.all(items); }
    this.clear();
    const progress = new Progress(this, items, opts);
    if (this.items == null) { this.items = []; }
    this.items.push(progress);
    this.draw();
    const promise = Promise.all(items);
    promise.PromiseBar = progress;
    return promise;
  }

  /*
  Sets up PromiseBar to manage stdout.  Until `enable()` is called, `PromiseBar.all()` acts like `Promise.all()`.
  Can be called multiple times without ill effect, as long as {PromiseBar#end} hasn't been called.
  @todo redraw on console resize
  */
  enable() {
    if (this.enabled) { return; }
    const ansi = require("ansi");
    this.cursor = ansi(process.stdout);
    this.draw();
    this.bufferstdout();
    process.stdout.on("newline", () => {
      if (this.processing || this.ended) { return; }
      this.clear();
      return this.draw();
    });
    process.on("exit", () => {
      return this.end();
    });
    return this.enabled = true;
  }

  /*
  Restore original stdout behavior, and prevent PromiseBar from trying changing the output.
  */
  end() {
    if (this.ended) { return; }
    if (this.items && Array.isArray(this.items)) {
      this.processing = true;
      for (let i = 0, end = this.lines(), asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
        this.cursor.down();
      }
    }
    return this.ended = true;
  }

  /*
  Removes all progress bars in stdout.  Assumes that the cursor is on the first line of the progress bars
  (under the blank line).  Returns the cursor to the starting position.
  */
  clear() {
    if (this.ended) { return; }
    if (!this.items || !Array.isArray(this.items)) { return; }
    this.processing = true;
    for (let i = 1, end = this.lines(), asc = 1 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
      this.cursor.eraseLine().down();
    }
    this.cursor.up(this.lines());
    return this.processing = false;
  }

  /*
  Determine the maximum label length for progress bars.
  @param {Boolean} deep if `true`, check nested progress bars.  Defaults to `false`.
  @return {Number} the length of the longest label.
  */
  maxLabelLength(deep) {
    if (deep == null) { deep = false; }
    let max = 0;
    for (let item of Array.from(this.items)) {
      if (item.rawLabel) { max = Math.max((item.indent.length + item.rawLabel.length), max); }
      if (deep) { max = Math.max(item.maxLabelLength(true), max); }
    }
    return max;
  }

  /*
  Draw the progress bars to stdout, including a blank line at the start.
  */
  draw() {
    if (this.ended) { return; }
    if (!this.items || !Array.isArray(this.items)) { return; }
    this.processing = true;
    console.log("");
    for (let item of Array.from(this.items)) {
      item.draw(this.maxLabelLength(true));
    }
    this.cursor.up(this.lines() + 1);
    return this.processing = false;
  }

  /*
  The number of lines of stdout that the progress bars take.
  @return {Number}
  */
  lines() {
    return this.items.map(i => i.lines()).reduce(((a, b) => a + b), 0);
  }

  /*
  PromiseBar needs stdout to print one line at a time.  Overwrites `process.stdout.write` to write strings that include
  `\n` into multiple writes.
  */
  bufferstdout() {
    const {
      write
    } = process.stdout;
    return process.stdout.write = (data, ...args) => {
      if ((typeof data !== "string") || this.processing || this.ended || (data.indexOf("\n") === -1)) {
        return write.apply(process.stdout, [data, ...Array.from(args)]);
      }
      let lines = data.split("\n");
      if (data.slice(-1) === "\n") { lines = lines.slice(0, -1); }
      return Array.from(lines).map((line) =>
        write.apply(process.stdout, [`${line}\n`, ...Array.from(args)]));
    };
  }
}
PromiseBar.initClass();

const bar = new PromiseBar();

module.exports = bar;
