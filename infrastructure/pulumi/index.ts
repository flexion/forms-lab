import * as aws from '@pulumi/aws'
import * as pulumi from '@pulumi/pulumi'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const config = new pulumi.Config()
const sshKeyPath = config.require('sshPublicKeyPath')
const sshPublicKey = readFileSync(resolve(sshKeyPath), 'utf-8').trim()

// Look up the latest NixOS 24.11 AMI
const nixosAmi = aws.ec2.getAmi({
  mostRecent: true,
  owners: ['427812963091'], // NixOS community AMI owner
  filters: [
    { name: 'name', values: ['nixos/24.11*'] },
    { name: 'architecture', values: ['x86_64'] },
  ],
})

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

// EC2 instance
const instance = new aws.ec2.Instance('forms-lab', {
  ami: nixosAmi.then((ami) => ami.id),
  instanceType: 't3.small',
  keyName: keyPair.keyName,
  vpcSecurityGroupIds: [sg.id],
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

// Outputs
export const instanceId = instance.id
export const publicIp = eip.publicIp
export const hostname = eip.publicDns
export const sshCommand = pulumi.interpolate`ssh root@${eip.publicDns}`
