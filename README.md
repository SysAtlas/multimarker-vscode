# multimarker 

Multimarker was written since VSCode does not support spawning multiple cursors in arbitrary positions in a convenient way.

## Features

Give the following functions keybindings you like, suggested bindings are in braces.

- multimarker.markPosition (ctrl+m ctrl+m):

Sets a mark at the position of the cursor, unmarks if a mark is already set on the same position.

- multimarker.applyCursors (ctrl+m ctrl+i):

Adds a multicursor in place of each mark.

- multimarker.clearMarks (ctrl+m escape):

Removes all marks.

- multimarker.markAndGotoNext (ctrl+m ctrl+n):

Sets mark at the beginning of the word under cursor, goes to its next occurrence.
Does not unmark, does not wrap.

- multimarker.markAndGotoPrev (ctrl+m ctrl+p):

Sets mark at the beginning of the word under cursor, go to its previous occurrence.
Does not unmark, does not wrap.