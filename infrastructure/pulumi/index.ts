import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const config = new pulumi.Config()
const sshKeyPath = config.require('sshPublicKeyPath')
const sshPublicKey = readFileSync(resolve(sshKeyPath), 'utf-8').trim()

const instanceType = config.get('instanceType') || 't3.medium'
const amiId = config.require('amiId')
const domain = config.get('domain')
const nixosAmi = Promise.resolve({ id: amiId })

// SSH key pair
const keyPair = new aws.ec2.KeyPair('forms-lab-key', {
  publicKey: sshPublicKey,
})

// Security group
const sg = new aws.ec2.SecurityGroup('forms-lab-sg', {
  description: 'Forms Lab EC2 security group',
  ingress: [
    // SSH
    {
      protocol: 'tcp',
      fromPort: 22,
      toPort: 22,
      cidrBlocks: ['0.0.0.0/0'], // Restrict to your IP in production
      description: 'SSH access',
    },
    // HTTP
    {
      protocol: 'tcp',
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'HTTP',
    },
    // HTTPS
    {
      protocol: 'tcp',
      fromPort: 443,
      toPort: 443,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'HTTPS',
    },
  ],
  egress: [
    {
      protocol: '-1',
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ['0.0.0.0/0'],
      description: 'All outbound',
    },
  ],
})

// IAM role for EC2 instance (Bedrock access)
const role = new aws.iam.Role('forms-lab-role', {
  assumeRolePolicy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: 'ec2.amazonaws.com' },
        Action: 'sts:AssumeRole',
      },
    ],
  }),
  tags: { Name: 'forms-lab' },
})

new aws.iam.RolePolicy('forms-lab-bedrock', {
  role: role.id,
  policy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        Resource: [
          // Direct model invocation (any US region — cross-region
          // inference routes to the least-loaded region)
          'arn:aws:bedrock:us-*::foundation-model/*',
          // Cross-region inference profiles (us.anthropic.* model IDs)
          'arn:aws:bedrock:us-*:*:inference-profile/*',
        ],
      },
    ],
  }),
})

new aws.iam.RolePolicy('forms-lab-secrets', {
  role: role.id,
  policy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['secretsmanager:GetSecretValue'],
        Resource: [
          'arn:aws:secretsmanager:us-east-1:*:secret:forms-lab/*',
        ],
      },
    ],
  }),
})

const secretNames = [
  'github-webhook-secret',
  'github-token',
  'github-client-id',
  'github-client-secret',
  'session-secret',
  'slack-webhook-url',
]

for (const name of secretNames) {
  new aws.secretsmanager.Secret(`forms-lab-secret-${name}`, {
    name: `forms-lab/${name}`,
    description: `Forms Lab: ${name}`,
    tags: { Project: 'forms-lab' },
  })
}

const instanceProfile = new aws.iam.InstanceProfile('forms-lab-profile', {
  role: role.name,
})

// EC2 instance
const instance = new aws.ec2.Instance('forms-lab', {
  ami: nixosAmi.then((ami) => ami.id),
  instanceType: instanceType,
  keyName: keyPair.keyName,
  vpcSecurityGroupIds: [sg.id],
  iamInstanceProfile: instanceProfile.name,
  rootBlockDevice: {
    volumeSize: 30,
    volumeType: 'gp3',
  },
  tags: {
    Name: 'forms-lab',
  },
})

// Elastic IP
const eip = new aws.ec2.Eip('forms-lab-eip', {
  instance: instance.id,
  tags: {
    Name: 'forms-lab',
  },
})

// Route53 hosted zone (only when domain is configured)
let zone: aws.route53.Zone | undefined
if (domain) {
	zone = new aws.route53.Zone('forms-lab-zone', {
		name: domain,
		tags: { Name: 'forms-lab' },
	})

	new aws.route53.Record('forms-lab-a', {
		zoneId: zone.zoneId,
		name: domain,
		type: 'A',
		ttl: 300,
		records: [eip.publicIp],
	})
}

// Outputs
export const instanceId = instance.id
export const publicIp = eip.publicIp
export const hostname = eip.publicDns
export const sshCommand = pulumi.interpolate`ssh root@${eip.publicDns}`
export const nameServers = zone?.nameServers
export const domainName = domain
