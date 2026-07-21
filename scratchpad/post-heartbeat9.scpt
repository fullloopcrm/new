set msgText to (do shell script "cat /Users/jefftucker/fullloopcrm/scratchpad/heartbeat-msg9.txt")
tell application "Claude" to activate
delay 1
tell application "System Events"
	set frontApp to name of first application process whose frontmost is true
	if frontApp is not "Claude" then
		error "Claude not frontmost, aborting post"
	end if
	keystroke msgText
	delay 1
	keystroke return
end tell
