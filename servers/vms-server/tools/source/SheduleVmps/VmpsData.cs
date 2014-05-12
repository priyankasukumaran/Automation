using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace SheduleVmps
{
    public class VMPSConfig
    {
        public string PathToVMWareVMXFile { get; set; }
        public string FullyQualifiedOSName { get; set; }
        public string flavour { get; set; }
        public string id { get; set; }
        public string vmpath { get; set; }
        public string localpath { get; set; }
    }


  public  class VmpsData
  {
      private string modeval;
      private string idval;
      private string jobid;


      private string pathToVMWareVMXFile;
      private string snapshotName;
      private string shutdownVMWarw;
      private string statusVMWarw;
      public string Modeval
      {
          get { return modeval; }
          set { modeval = value; }
      }

      public string Idval
      {
          get { return idval; }
          set { idval = value; }
      }

      public string Jobid
      {
          get { return jobid; }
          set { jobid = value; }
      }


      public string PathToVMWareVMXFile
      {
          get { return pathToVMWareVMXFile; }
          set { pathToVMWareVMXFile = value; }
      }
      public string SnapshotName
      {
          get { return snapshotName; }
          set { snapshotName = value; }
      }

      public string ShutdownVMWarw
      {
          get { return shutdownVMWarw; }
          set { shutdownVMWarw = value; }
      }

      public string StatusVMWarw
      {
          get { return statusVMWarw; }
          set { statusVMWarw = value; }
      }
  }
}
