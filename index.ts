import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as docker from "@pulumi/docker";


// Create a repository
const repo = new aws.ecr.Repository("my-repo", {
    forceDelete: true,
});

// Compute registry info (creds and endpoint)

let registryInfo = repo.registryId.apply(async registryId => {
    let credentials = await aws.ecr.getCredentials({registryId: registryId});
    let decodedCredentials = Buffer.from(credentials.authorizationToken, "base64").toString();
    let [username, password] = decodedCredentials.split(":");
    if (!password || !username) {
        throw new Error("Invalid authorization token");
    }

    return {
        server: credentials.proxyEndpoint,
        username: username,
        password: password,
    };
});

// use the repo url to push the image
const image_api = repo.repositoryUrl;
const image_web = repo.repositoryUrl;

// Use the docker.Image resource to build and publish this Api image to AWS ECR.
const apiimage = new docker.Image("apiimage", {
    imageName: image_api,
    build: {
        context: "/Users/tkma2h0/Desktop/Infra",  // Change this to the directory of your Dockerfile if needed
        dockerfile: "/Users/tkma2h0/Desktop/Infra/infra-api/Dockerfile" // Name of the Dockerfile,
        
    },
    registry: registryInfo,
});

// Use the docker.Image resource to build and publish this Api image to AWS ECR.
const webimage = new docker.Image("webimage", {
    imageName: image_web,
    build: {
        context: "/Users/tkma2h0/Desktop/Infra",  // Change this to the directory of your Dockerfile if needed
        dockerfile: "/Users/tkma2h0/Desktop/Infra/infra-web/Dockerfile" // Name of the Dockerfile,
        
    },
    registry: registryInfo,
});

// Create an ECS cluster
let cluster = new aws.ecs.Cluster("myCluster");

// Deploy ECS service running the image from ECR repository
let apiSvc = new awsx.ecs.FargateService("api-service", {
    cluster: cluster.arn,
    taskDefinitionArgs: {
        containers: {
            app: {
                image: image_api,
                memory: 512
            }
        }
    },
    assignPublicIp: true,
    desiredCount: 1,
});

// Deploy ECS service running the image from ECR repository
let webSvc = new awsx.ecs.FargateService("web-service", {
    cluster: cluster.arn,
    taskDefinitionArgs: {
        containers: {
            app: {
                image: image_web,
                memory: 512
                }
            }
        },
    assignPublicIp: true,
    desiredCount: 1,
});


// Export the resulting base name in case we want to use it elsewhere
//export const baseImageName = apiimage.baseImageName;




