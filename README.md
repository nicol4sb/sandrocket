
Prompt

I want to create a simple todo app.

Tasks can have up to 150 characters, and a creation date and time. Show the creation date+time on hover over the title, or appropriate UX.
Since the project will have various major areas where progress needs to be had in parallel, allow some concept of epic for a task to belong to.
Each epic is one level of the rocket, has a name and a pastille. A task always belongs to an epic. Tasks of an epic are all in the same rocket level. Tasks can be edited after creation, and the epic they belong to can be changed during edition.
Epics can be created but maximum of 6 open epics with live tasks. 

The app needs to be password protected, this is just for 2 people sharing a list of tasks to tackle together.
Both user can create, mark as done, delete tasks. A shared pwd would be good enough.

The app will look like a Tintin rocket, 
with post-its containing the tasks, stuck on the rocket.
Tasks can be moved up and down by dragging and dropping so the priority between them is clear visually. They can be positioned anywhere on or besides the rocket - two dimensional. Order is not important, it is naturally derived from the visual positioning.

UX directions :
Make all the text fields editable when clicked. Titles, body, links
Make sure the text is wrapped in the tasks.
The task should be deleted via a cross top right
The top banner should float when scrolling down
The epics should be presented vertically so the order is clear between tasks
Tasks are moveable within one epic only
Style should be modern, high contrast so text is very readable

Journal :
A foldable panel will keep track of every change so we can follow what the other user does. So typically creating, amending, moving a task, marking it as done, etc. I would go for the full journal ,loading it with an infinite scroll.
Upon new connection/reconnection to the app, the updates done by the other should be broadcasted somewhat visibly. user A moved task "DEF", created task "ABCD", marked task "XYZ" as achieved etc.

The app should be a webapp, it just seems simpler for now.
The app offers creation of tasks with a nice appropriate UI component, maybe a + sign somewhere.
I want a nice UX to delete tasks, including a confirmation dialog.

I want a nice UX to mark a task as done single click. Once it is done, it goes into a list below, with last closed at the top, appearing only as a list, the visual post it of the acrd disappears, so it gives a nice sense of achievement. A closed task can be reopened from the list.
You can create nice UX effects like a slide into the list to make it an enjoyable moment to close a task.

The purpose of the app is to motivate participants to plan and execute the tasks - make the phone calls, drive decisions etc etc.

The tasks will need to persist in a shared place somewhere.
