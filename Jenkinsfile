NPM_REGISTRY = "https://repository.sagex3.com:8443/repository/x3-npm-hosted"

def buildAndPublish() {

    docker.image('node:8-alpine').inside("-u root:root") {
        withCredentials([string(credentialsId: 'NPM_USER_X3', variable: 'NPM_USER'),
                         string(credentialsId: 'NPM_PASS_X3', variable: 'NPM_PASS')])
                {

                    sh("npm install -g --no-audit npm-cli-login mocha")

                    //Do it twice beause of a weird bug with / at the end of url
                    sh("npm-cli-login -u \"${NPM_USER}\" -p \"${NPM_PASS}\" -e \"${NPM_USER}@sage.com\" " +
                            "-r \"${NPM_REGISTRY}/\" -s \"@cirrus\"")
                    sh("npm-cli-login -u \"${NPM_USER}\" -p \"${NPM_PASS}\" -e \"${NPM_USER}@sage.com\" " +
                            "-r \"${NPM_REGISTRY}/\" -s \"@sage\"")

                    sh("npm-cli-login -u \"${NPM_USER}\" -p \"${NPM_PASS}\" -e \"${NPM_USER}@sage.com\" " +
                            "-r \"${NPM_REGISTRY}\" -s \"@cirrus\"")
                    sh("npm-cli-login -u \"${NPM_USER}\" -p \"${NPM_PASS}\" -e \"${NPM_USER}@sage.com\" " +
                            "-r \"${NPM_REGISTRY}\" -s \"@sage\"")

                    sh("npm install || (rm -Rvf * && exit 1)")
                    sh("npm test")
                    sh("rm -Rf node_modules")
                    sh("cat  package.json")
                    sh("npm publish")
                }
    }
}

node {
    checkout scm
    buildAndPublish()
}