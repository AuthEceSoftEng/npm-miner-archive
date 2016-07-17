from __future__ import with_statement

import os
from time import sleep
from fabric.api import run, cd, env, hosts
from fabric.context_managers import shell_env


# Hosts
WEB_SERVER = os.environ['WEB_SERVER_HOST']

REPO = 'git@github.com:AuthEceSoftEng/npm-miner.git'


def web_server():
    env.forward_agent = True
    env.port = os.environ['WEB_SERVER_PORT']
    env.user = os.environ['WEB_SERVER_USER']
    env.PATH = os.environ['WEB_SERVER_PATH']


@hosts(WEB_SERVER)
def deploy_web_app():
    folders = run('ls').split(' ')

    if 'app' in folders:
        with shell_env(PATH=env.PATH) as a, cd('app') as b:
            run('git pull --rebase origin master')
            run('make install')
            run('make prod')
            run('pm2 restart app')
    else:
        run('git clone ' + REPO + ' app')
        with shell_env(PATH=env.PATH) as a, cd('app') as b:
            run('make install')
            run('make global')
            run('make prod')
            run('pm2 start server/app.js')
    sleep(5)
    run('curl http://localhost:3000/api/metrics?name=npm')

