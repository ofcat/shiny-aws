import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as cdk from 'aws-cdk-lib'

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ShinyAwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const vpc = new ec2.Vpc(this, 'MyVpc');
    const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      vpc: vpc,
      internetFacing: true,
      loadBalancerName: 'DashboardBalancer'
    });

    const cluster = new ecs.Cluster(this, 'DashboardCluster', {
      vpc: vpc
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      cpu: 512,
      memoryLimitMiB: 1024,
    });
    
    const port = 3838
    
    const container = taskDefinition.addContainer('Container', {
      image: ecs.ContainerImage.fromRegistry('rocker/shiny'),
      portMappings: [{ containerPort: port }],
    })
    
    const service = new ecs.FargateService(this, 'FargateService', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      desiredCount: 1,
      serviceName: 'FargateService'
    })

    const tg1 = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc: vpc,
      targets: [service],
      protocol: elbv2.ApplicationProtocol.HTTP,
      stickinessCookieDuration: cdk.Duration.days(1),
      port: port,
      healthCheck: {
        path: '/',
        port: `${port}`
      }
    })

    const listener = lb.addListener(`HTTPListener`, {
      port: 80,
      defaultAction: elbv2.ListenerAction.forward([tg1]) 
    })

    new cdk.CfnOutput(this, 'LoadBalancerDNSName', { value: lb.loadBalancerDnsName });

    // example resource
    // const queue = new sqs.Queue(this, 'ShinyAwsQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
