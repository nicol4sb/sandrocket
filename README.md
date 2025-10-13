
Prompt

I want to create a simple todo app.

Tasks can have up to 150 characters plus a link.
The app needs to be password protected, this is just for 2 people sharing a list of tasks to tackle together.
Both user can create, mark as done, delete tasks. A shared pwd would be good enough.

The app will look like a Tintin rocket, 
with post-its containing the tasks, stuck on the rocket.
Tasks can be moved up and down by dragging and dropping so the priority between them is clear visually.
A foldable panel will keep track of every change so we can follow what the other user does. So typically creating, amending, moving a task, marking it as done, etc. I would go for the full journal ,loading it with an infinite scroll.

Making it a phone app might be a good idea - it just needs to be simple to manage on the dev side.
Users have apple and android. Propose something simple that can be built today right away.
Sure! Pl
The app offers creation of tasks with a nice appropriate UI component, maybe a + sign somewhere.
I want a nice UX to delete tasks as well with a confirmation dialog.

I want a nice UX to mark a task as done. Once it is done, it goes into a list below, with most recently closed at the top, so it gives a nice sense of achievement.
You can create nice UX effects to make it an enjoyable moment to close a task.

The purpose of the app is to motivate participants to plan and execute the tasks - make the phone calls, drive decisions etc etc.

The tasks will need to persist in a shared place somewhere - normally it would be a database but be creative. It does not need to be - the state just needs to be consistent across the 2 users near real time.
A backend store is not a problem, but maybe you can suggest a better lighter approach. Why not peer to peer for example. This would be ok actually. Not sure how the clients would find each other but maybe doable. Would actually be super cool.
Edition offline should be supported. 
In case of conflict when going back online, some level of failure is acceptable - where no conflict, like creating a new task, there should be full support.

