tell application "Claude" to activate
delay 1
tell application "System Events"
	set frontApp to name of first application process whose frontmost is true
end tell
return frontApp
