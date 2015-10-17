Captcha + Email bypass script
============

Introduction
----------
Few months ago I was participating in a IT competition. There were 2 rounds. In order to qualify for the second(final) round I had to spread a unique vote link. My friends had to open the link, enter the captcha code right, then fill their email(unique each time) and confirm their vote from it. Not fun right?

The script
-------
The idea of this script is to bypass the whole process described above.
First I had to bypass the captcha. Here's an actual screenshot:

![original captcha](http://i.imgur.com/eU1FMle.png)

So in our project I was using Tesseract. This is probably the best open-source OCR software out there. But because of the background it couldn't recognize anything. That's why I picked GraphicMagic and started to playing with its settings. I managed to get the best results from threshold property, then I upscaled the image 3 times(both width and height) and applied edge rounding and the final result was:

![captcha result](http://i.imgur.com/6NiYQFm.jpg)

---------
Horraaay. I had 80% success rate with the recognization, so that meant 2 of every 10 request will fail, which was completely fine for me. Okay, but I had to confirm every vote from the email. So I did a research and found `simplesmtp` NodeJS module and I managed to run my own SMTP server. Since the email cannot be just name@MYIP, I uploaded the script to one of my VPS servers and it had a domain attached to it. So everything that was sent to NAME@deepsy.net was redirected to my SMTP server. I managed to setup the server, so from each received email on this domain(no matter what the name before `@` is) all URLS are parsed and a GET request is executed with them.

-----------

Now comes the third problem, I had to do all of these requests with 1 session, because the captcha was saved server side via session. I shared a cookie jar between all vote requests. The process is working like this:

* Before each vote request the homepage, so a session can be assigned to me
* Request the capcha image with the received cookies
* Process the image through GraphicMagic and apply few settings, so the image will become much clearer
* Process the cleaned image through Tesseract and recognize the text
* Send(again with the cookies) as POST request the project id, random generated email (@deepsy.net) and the captcha code
* SMTP server listens for all incoming emails and opens all links in it, so when a new confirmation email is received, the vote is confirmed instatly

I was able to achieve peak of about 30req/s, but didn't really want to push it more, because I was about to get banned by the firewall. Now if you're still reading, you can take a look at `worker.js`..