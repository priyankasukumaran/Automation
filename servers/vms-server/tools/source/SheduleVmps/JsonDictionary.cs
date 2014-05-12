using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Runtime.Serialization;

namespace SheduleVmps
{

    [Serializable]
    public class JsonDictionary<Key, Value> : ISerializable
    {
        Dictionary<Key, Value> dict = new Dictionary<Key, Value>();

        public JsonDictionary() { }

        protected JsonDictionary(SerializationInfo info, StreamingContext context)
        {
            throw new NotImplementedException();
        }

        public void GetObjectData(SerializationInfo info, StreamingContext context)
        {
            foreach (Key key in dict.Keys)
            {
                info.AddValue(key.ToString(), dict[key]);
            }
        }

        public void Add(Key key, Value value)
        {
            dict.Add(key, value);
        }

        public int Count()
        {
             return dict.Count;
        }

        public Value this[Key index]
        {
            set { dict[index] = value; }
            get { return dict[index]; }
        }
    }
}
