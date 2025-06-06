## Python - Raw Websockets

### Usage

#### Authentication

Fill in values for `REALTIME_API_HOST` and `REALTIME_API_HOST` in the root of this repository with values provided by your account manager.

#### Execution

```
# ensure python3 is installed
python3 --version

# create a virtual environment
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
venv\\Scripts\\activate   # Windows

# install dependencies
pip install -r requirements.txt

# run
python3 main.py
```