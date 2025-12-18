Currently looking into SingeFile Extension 

It did not work , autosave just never triggers
looking to make own replacement 

# INITIAL SETUP

Initial set up is done now core logic should be 
1. Content.js asks if this tab is currently focused, if yes then only setup timers for it.
    currently every website is being backupd
2. There needs to be a way to see if different than what is saved , i would suggest saving sha in filename itself, but i think
    that isnt right call , maby see file sizze itself , if significantly more content is detected (bytes) then only backup ,maby another
    popup setting to overide this rule
3. data saving must be blackboxed, other users might want whole html instead of text
4. Maby tooltips for settings
 
### so basic pipeline
1. content.js checks if extension is enabled(default is disabled)

