import smtplib
from email.mime.text import MIMEText
m = MIMEText("oi do notify")
m["From"] = "from@test.local"
m["To"] = "to@test.local"
m["Subject"] = "probe"
try:
    with smtplib.SMTP("mailhog", 1025, timeout=5) as s:
        s.send_message(m)
    print("SENT")
except Exception as e:
    print(f"ERR: {type(e).__name__}: {e}")
